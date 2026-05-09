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
			network.getWifiNetworks(),
			network.getHostHints()
		]).then(radios_networks_hints => {
			const tasks = [];
			for (let i = 0; i < radios_networks_hints[1].length; i++)
				tasks.push(L.resolveDefault(radios_networks_hints[1][i].getAssocList(), []).then(L.bind((net, list) => {
					net.assoclist = list.sort((a, b) => a.mac.localeCompare(b.mac));
				}, this, radios_networks_hints[1][i])));

			return Promise.all(tasks).then(() => {
				return radios_networks_hints;
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
		// 1. 无线射频网络模块 (CSS Grid 卡片布局)
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

		// ==========================================
		// 2. 连接设备列表模块 (虚拟 Flex 表格)
		// ==========================================
		const container_devices_wrapper = E('div', { 'class': 'wifi-clients-wrapper' });

		const table = E('div', { 'class': 'modern-flex-table' }, [
			// 表头 (手机端会自动隐藏)
			E('div', { 'class': 'tr thead dashboard-bg hide-xs' }, [
				E('div', { 'class': 'th col-device' }, _('Device & MAC')),
				E('div', { 'class': 'th col-signal' }, _('Network & Signal')),
				E('div', { 'class': 'th col-traffic' }, _('Traffic (RX/TX)'))
			])
		]);

		for (let i = 0; i < this.params.wifi.devices.length; i++) {
			const device = this.params.wifi.devices[i];
			const row = E('div', { 'class': `tr tbody-row ${i % 2 ? 'cbi-rowstyle-2' : 'cbi-rowstyle-1'}` }, [

				// 列 1: 主机名与 MAC 地址聚合
				E('div', { 'class': 'td col-device' }, [
					E('div', { 'class': 'device-name' }, device.hostname.value),
					E('div', { 'class': 'device-mac text-muted' }, device.hostname.mac) // JS中新增的MAC属性
				]),

				// 列 2: SSID 与 高级进度条聚合
				E('div', { 'class': 'td col-signal' }, [
					E('div', { 'class': 'network-name text-muted' }, device.ssid.value),
					E('div', { 'class': 'cbi-progressbar modern-progress', 'title': `RSSI: ${parseInt(device.progress.value.qualite)}% (${device.progress.value.rssi}dBm)` }, [
						E('div', { 'style': `width: ${device.progress.value.qualite}%`, 'class': device.progress.value.style })
					])
				]),

				// 列 3: 上下行流量聚合 (带直观箭头)
				E('div', { 'class': 'td col-traffic' }, [
					E('div', { 'class': 'traffic-stat rx' }, [ E('span', '↓ '), device.transferred.value.rx ]),
					E('div', { 'class': 'traffic-stat tx' }, [ E('span', '↑ '), device.transferred.value.tx ])
				])
			]);
			table.appendChild(row);
		}

		// 表尾统计
		table.appendChild(E('div', { 'class': 'tr tfoot dashboard-bg' }, [
			E('div', { 'class': 'td col-device' }, E('strong', _('Total Connected:'))),
			E('div', { 'class': 'td col-signal' }, E('strong', this.params.wifi.devices.length)),
			E('div', { 'class': 'td col-traffic' }, '')
		]));

		container_devices_wrapper.appendChild(table);
		container_wapper.appendChild(container_devices_wrapper);

		return container_wapper;
	},

	renderUpdateData(radios, networks, hosthints) {
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

		for (let i = 0; i < networks.length; i++) {
			for (let k = 0; k < networks[i].assoclist.length; k++) {
				const bss = networks[i].assoclist[k];
				const name = hosthints.getHostnameByMACAddr(bss.mac);

				let progress_style;
				const defaultNF = -90;
				const defaultCeil = -30;
				const q = Math.max(0, Math.min(100, 100 * ((bss.signal - (bss.noise ? bss.noise: defaultNF)) / (defaultCeil - (bss.noise ? bss.noise : defaultNF)))));

				if (q < 25) progress_style = 'bg-danger';
				else if (q < 50) progress_style = 'bg-warning';
				else progress_style = 'bg-success';

				this.params.wifi.devices.push({
					hostname: {
						visible: true,
						value: name || '?',
						mac: bss.mac // ✨ 这里将 MAC 地址注入到了渲染数据中！
					},
					ssid: { visible: true, value: networks[i].getActiveSSID() },
					progress: { visible: true, value: { qualite: q, rssi: bss.signal, style: progress_style } },
					transferred: { visible: true, value: { rx: '%.2mB'.format(bss.rx.bytes), tx: '%.2mB'.format(bss.tx.bytes) } }
				});
			}
		}
	},

	render([radios, networks, hosthints]) {
		this.params.wifi = { radios: [], devices: [] };
		this.renderUpdateData(radios, networks, hosthints);
		if (this.params.wifi.radios.length) return this.renderHtml();
		return E([]);
	}
});
