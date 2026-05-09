'use strict';
'require baseclass';
'require rpc';
'require network';

var callLuciDHCPLeases = rpc.declare({
	object: 'luci-rpc',
	method: 'getDHCPLeases',
	expect: { '': {} }
});

return baseclass.extend({
	title: _('DHCP Devices'),

	params: {},

	load() {
		return Promise.all([
			callLuciDHCPLeases(),
		]);
	},

	renderHtml() {
		const container_wapper = E('div', { 'class': 'router-status-lan dashboard-bg box-s1' });
		const container_box = E('div', { 'class': 'lan-info devices-list', 'style': 'padding: 1.5em;' });

		// 1. 顶部标题
		container_box.appendChild(E('div', { 'class': 'title', 'style': 'text-align: center; margin-bottom: 20px;' }, [
			E('img', {
				'src': L.resource('view/dashboard/icons/devices.svg'),
				'width': 55,
				'title': this.title,
				'class': 'middle svgmonotone',
				'style': 'display: inline-block; vertical-align: middle; margin-right: 10px;'
			}),
			E('h3', { 'style': 'display: inline-block; vertical-align: middle; margin: 0;' }, this.title)
		]));

		const container_devices_wrapper = E('div', { 'class': 'lan-clients-wrapper', 'style': 'width: 100%; overflow: hidden;' });

		// 2. 💡 魔法注入：专门针对 LAN 列表的三列布局样式 (带终极手机端优化)
		const dynamicStyles = E('style', {}, `
			.lan-flex-table .col-host { flex: 1 1 35%; }
			.lan-flex-table .col-mac { flex: 1 1 35%; padding: 0 15px; }
			.lan-flex-table .col-ip { flex: 1 1 30%; text-align: right; }

			/* 手机端极致紧凑卡片优化：一行变两行，左右平分 */
			@media screen and (max-width: 800px) {
				.lan-flex-table .tbody-row {
					flex-wrap: wrap !important;
					flex-direction: row !important; /* 允许内部元素折行并排 */
				}

				/* 第一行：主机名霸占 100% 宽度，底部使用柔和实线分割 */
				.lan-flex-table .col-host {
					width: 100% !important;
					flex: 1 1 100% !important;
					border-bottom: 1px solid rgba(0,0,0,0.06);
					padding-bottom: 8px !important;
					margin-bottom: 8px !important;
				}

				/* 第二行左侧：MAC 地址占 50% */
				.lan-flex-table .col-mac {
					width: auto !important;
					flex: 1 1 50% !important;
					padding: 0 !important;
					font-size: 11px !important; /* 稍微缩小 MAC 更精致 */
					align-self: center;
				}

				/* 第二行右侧：IP 地址占 50%，强制靠右 */
				.lan-flex-table .col-ip {
					width: auto !important;
					flex: 1 1 50% !important;
					text-align: right !important;
					margin-top: 0 !important;
					padding: 0 !important;
					align-self: center;
				}
			}
		`);
		container_wapper.appendChild(dynamicStyles);

		// 3. 构建 3 列的现代 Flex 表格
		const table = E('div', { 'class': 'modern-flex-table lan-flex-table' }, [
			E('div', { 'class': 'tr thead dashboard-bg hide-xs' }, [
				E('div', { 'class': 'th col-host' }, _('Hostname')),
				E('div', { 'class': 'th col-mac' }, _('MAC')),
				E('div', { 'class': 'th col-ip' }, _('IP Address'))
			])
		]);

		// 4. 遍历渲染 3 列数据
		for(let i = 0; i < this.params.lan.devices.length; i++) {
			const device = this.params.lan.devices[i];

			const row = E('div', { 'class': `tr tbody-row ${i % 2 ? 'cbi-rowstyle-2' : 'cbi-rowstyle-1'}` }, [

				// 第一列: 主机名
				E('div', { 'class': 'td col-host' }, [
					E('div', { 'class': 'device-name', 'style': 'font-weight: 600;' }, device.hostname)
				]),

				// 第二列: MAC 地址 (采用等宽字体，灰色弱化)
				E('div', { 'class': 'td col-mac', 'style': 'font-family: monospace; font-size: 13px; color: #6c757d;' }, device.macaddr),

				// 第三列: IP 地址 (去除突兀颜色，跟随系统默认字体颜色)
				E('div', { 'class': 'td col-ip', 'style': 'font-family: monospace; font-size: 15px;' }, [
					E('strong', {}, device.ipv4)
				])
			]);

			table.appendChild(row);
		}

		// 5. 表尾统计 (三列对齐)
		table.appendChild(E('div', { 'class': 'tr tfoot dashboard-bg', 'style': 'border-top: 2px solid rgba(0,0,0,0.1);' }, [
			E('div', { 'class': 'td col-host' }, E('strong', _('Total') + '：')),
			E('div', { 'class': 'td col-mac hide-xs' }, ''), // 手机端自动隐藏中间的空列
			E('div', { 'class': 'td col-ip' }, E('strong', this.params.lan.devices.length))
		]));

		container_devices_wrapper.appendChild(table);
		container_box.appendChild(container_devices_wrapper);
		container_wapper.appendChild(container_box);

		return container_wapper;
	},

	renderUpdateData(leases) {
		const dev_arr = [];

		leases.forEach(({ hostname = '?', ipaddr: ipv4 = '-', macaddr = '00:00:00:00:00:00' }) => {
			dev_arr.push({ hostname, ipv4, macaddr });
		});

		this.params.lan = { devices: dev_arr };
	},

	renderLeases(leases) {
		this.renderUpdateData([...leases.dhcp_leases]);
		return this.renderHtml();
	},

	render([leases]) {
		if (L.hasSystemFeature('dnsmasq') || L.hasSystemFeature('odhcpd'))
			return this.renderLeases(leases);

		return E([]);
	}
});
