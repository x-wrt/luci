'use strict';
'require baseclass';
'require dom';
'require network';
'require rpc';

return baseclass.extend({

	title: _('Wireless'),
	params: [],

	load() {
		return Promise.all([
			network.getWifiDevices(),
			network.getWifiNetworks() // 移除了 network.getHostHints()，不再需要主机名
		]).then(radios_networks => {
			const tasks = [];
			for (let i = 0; i < radios_networks[1].length; i++)
				tasks.push(L.resolveDefault(radios_networks[1][i].getAssocList(), []).then(L.bind((net, list) => {
					net.assoclist = list; // 移除了 MAC 排序逻辑，仅保留列表用于计算“连接数”
				}, this, radios_networks[1][i])));

			return Promise.all(tasks).then(() => {
				return radios_networks;
			});
		});
	},

	renderHtml() {
		const container_wapper = E('div', { 'class': 'router-status-wifi dashboard-bg box-s1' });

		container_wapper.appendChild(E('div', { 'class': 'title', 'style': 'text-align: center; margin-bottom: 20px;' }, [
			E('img', {
				'src': L.resource('view/dashboard/icons/wireless.svg'),
				'width': 55,
				'title': this.title,
				'class': 'middle svgmonotone',
				'style': 'display: inline-block; vertical-align: middle; margin-right: 10px;'
			}),
			E('h3', { 'style': 'display: inline-block; vertical-align: middle; margin: 0;' }, this.title)
		]));

		// ==========================================
		// 1. 无线射频网络模块 (CSS Grid 卡片布局) - 仅保留此部分
		// ==========================================
		const container_radios = E('div', { 'class': 'wifi-networks-grid' });

		for (let i = 0; i < this.params.wifi.radios.length; i++) {
			const radio = this.params.wifi.radios[i];
			const isUp = radio.isactive.value === true || radio.isactive.value === _('yes');

			const card = E('div', { 'class': 'wifi-radio-card' }, [
				E('div', { 'class': 'card-header' }, [
					E('div', { 'class': 'ssid-name' }, radio.ssid.value),
					E('span', { 'class': isUp ? 'label label-success' : 'label label-danger' }, isUp ? _('Active') : _('Disabled'))
				]),
				E('div', { 'class': 'card-body' }, [
					E('div', { 'class': 'info-row' }, [ E('span', _('Channel')), E('strong', radio.chan.value) ]),
					E('div', { 'class': 'info-row' }, [ E('span', _('Bitrate')), E('strong', radio.rate.value) ]),
					E('div', { 'class': 'info-row' }, [ E('span', _('BSSID')), E('strong', radio.bssid.value) ]),
					E('div', { 'class': 'info-row' }, [ E('span', _('Encryption')), E('strong', radio.encryption.value) ]),
					E('div', { 'class': 'info-row highlight' }, [ E('span', _('Devices Connected')), E('strong', radio.associations.value) ])
				])
			]);
			container_radios.appendChild(card);
		}
		container_wapper.appendChild(container_radios);

		return container_wapper;
	},

	renderUpdateData(radios, networks) {
		for (let i = 0; i < radios.sort((a, b) => a.getName().localeCompare(b.getName())).length; i++) {
			const network_items = networks.filter(net => { return net.getWifiDeviceName() == radios[i].getName() });

			for (let j = 0; j < network_items.length; j++) {
				const net = network_items[j];
				const is_assoc = (net.getBSSID() != '00:00:00:00:00:00' && net.getChannel() && !net.isDisabled());
				const chan = net.getChannel();
				const freq = net.getFrequency();
				const rate = net.getBitRate();

				this.params.wifi.radios.push({
					ssid: { visible: true, value: net.getActiveSSID() || '?' },
					isactive: { visible: true, value: !net.isDisabled() },
					chan: { visible: true, value: chan ? `${chan} (${Number(freq).toFixed(3)} GHz)` : '-' },
					rate: { visible: true, value: rate ? `${rate} Mbit/s` : '-' },
					bssid: { visible: true, value: is_assoc ? (net.getActiveBSSID() || '-') : '-' },
					encryption: { visible: true, value: is_assoc ? net.getActiveEncryption() : '-' },
					associations: { visible: true, value: is_assoc ? (net.assoclist.length || '0') : 0 }
				});
			}
		}
		// 移除了客户端列表 (devices) 相关的嵌套循环遍历代码
	},

	render([radios, networks]) {
		this.params.wifi = { radios: [] }; // 移除了 devices 数组
		this.renderUpdateData(radios, networks);
		if (this.params.wifi.radios.length) return this.renderHtml();
		return E([]);
	}
});
