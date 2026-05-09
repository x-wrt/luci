'use strict';
'require baseclass';
'require fs';
'require rpc';
'require network';
'require uci';

var callSystemBoard = rpc.declare({
	object: 'system',
	method: 'board'
});

var callSystemInfo = rpc.declare({
	object: 'system',
	method: 'info'
});

var callGetUnixtime = rpc.declare({
	object: 'luci',
	method: 'getUnixtime',
	expect: { result: 0 }
});

return baseclass.extend({

	params: [],

	load() {
		return Promise.all([
			network.getWANNetworks(),
			network.getWAN6Networks(),
			L.resolveDefault(callSystemBoard(), {}),
			L.resolveDefault(callSystemInfo(), {}),
			L.resolveDefault(callGetUnixtime(), 0),
			uci.load('system')
		]);
	},

	renderHtml(data, type) {
		let icon = type;
		const title = type === 'router' ? _('System') : _('Internet');
		const container_wapper = E('div', { 'class': `${type}-status-self dashboard-bg box-s1` });

		const container_box = E('div', { 'class': 'modern-status-card', 'style': 'padding: 1.5em;' });

		if (type === 'internet') {
			icon = (data.v4.connected.value || data.v6.connected.value) ? type : 'not-internet';
		}

		// 1. 顶部标题区域
		container_box.appendChild(E('div', { 'class': 'title-wrapper', 'style': 'text-align: center; margin-bottom: 25px;' }, [
			E('img', {
				'src': L.resource(`view/dashboard/icons/${icon}.svg`),
				'width': type === 'router' ? 64 : 54,
				'title': title,
				'class': (type === 'router' || icon === 'not-internet') ? 'middle svgmonotone' : 'middle',
				'style': 'display: inline-block; vertical-align: middle; margin-right: 10px;'
			}),
			E('h3', { 'style': 'display: inline-block; vertical-align: middle; margin: 0;' }, title)
		]));

		// 2. 💡 魔法注入：大屏双列响应式 CSS
		if (type === 'internet') {
			container_wapper.appendChild(E('style', {}, `
				/* 去除突兀蓝色，改用沉稳的高级深灰 */
				.modern-status-card .section-title { font-size: 15px; font-weight: 600; color: var(--text-color-high, #333); margin: 0 0 10px 0; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.08); }

				/* 互联网双列布局：电脑端并排，手机端自动折行 */
				.modern-status-card .internet-split { display: flex; flex-wrap: wrap; gap: 0 2.5rem; }
				.modern-status-card .internet-col { flex: 1 1 calc(50% - 1.25rem); min-width: 280px; margin-bottom: 15px; }

				/* 系统状态网格布局：电脑端两列/三列，手机端单列 */
				.modern-status-card .system-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); column-gap: 2.5rem; }

				/* 数据行基础样式 */
				.modern-status-card .info-row { display: flex; align-items: flex-start; padding: 12px 0; border-bottom: 1px dashed rgba(0,0,0,0.06); }
				.modern-status-card .info-row:last-child { border-bottom: none; }

				/* ⚠️ 核心修复：锁死标签宽度为 120px，绝不允许大屏拉伸 */
				.modern-status-card .info-label { flex: 0 0 120px; color: #6c757d; font-size: 13px; font-weight: 500; padding-right: 15px; }
				.modern-status-card .info-value { flex: 1 1 auto; min-width: 0; color: var(--text-color-high, #212529); font-size: 14px; word-break: break-all; overflow-wrap: break-word; }

				/* 夜间模式颜色适配 */
				[data-darkmode="true"] .modern-status-card .section-title { color: #e9ecef; border-bottom-color: rgba(255,255,255,0.1); }
				[data-darkmode="true"] .modern-status-card .info-label { color: #adb5bd; }
				[data-darkmode="true"] .modern-status-card .info-value { color: #e9ecef; }
				[data-darkmode="true"] .modern-status-card .info-row { border-bottom-color: rgba(255,255,255,0.05); }
			`));
		}

		// 渲染单行的统一函数
		const renderRow = (lbl, valNode) => {
			return E('div', { 'class': 'info-row' }, [
				E('div', { 'class': 'info-label' }, lbl),
				E('div', { 'class': 'info-value' }, valNode)
			]);
		};

		let container_item;

		if (type === 'internet') {
			// 互联网卡片：启用分列容器
			container_item = E('div', { 'class': 'settings-info internet-split' });

			// ================== IPv4 左列 ==================
			const col_v4 = E('div', { 'class': 'internet-col' });
			col_v4.appendChild(E('div', { 'class': 'section-title' }, data.v4.title));
			for (let k in data.v4) {
				if (k === 'title' || !data.v4[k].visible) continue;
				let val = data.v4[k].value;
				let valNode = val;

				if (k === 'connected') {
					valNode = E('span', { 'class': val ? 'label label-success' : 'label label-danger' }, val ? _('yes') : _('no'));
				} else if (k === 'addrsv4' && Array.isArray(val)) {
					valNode = val.map(ip => ip.split('/')[0]).join(', ');
				} else if (Array.isArray(val)) {
					valNode = val.join(', ');
				}
				col_v4.appendChild(renderRow(data.v4[k].title, valNode));
			}
			container_item.appendChild(col_v4);

			// ================== IPv6 右列 ==================
			const col_v6 = E('div', { 'class': 'internet-col' });
			col_v6.appendChild(E('div', { 'class': 'section-title' }, data.v6.title));
			for (let k in data.v6) {
				if (k === 'title' || !data.v6[k].visible) continue;
				let val = data.v6[k].value;
				let valNode = val;

				if (k === 'connected') {
					valNode = E('span', { 'class': val ? 'label label-success' : 'label label-danger' }, val ? _('yes') : _('no'));
				} else if (Array.isArray(val)) {
					valNode = val.join(', ');
				}
				col_v6.appendChild(renderRow(data.v6[k].title, valNode));
			}
			container_item.appendChild(col_v6);

		} else {
			// ================== Router (系统状态) 网格 ==================
			container_item = E('div', { 'class': 'settings-info system-grid' });
			for (let k in data) {
				container_item.appendChild(renderRow(data[k].title, data[k].value));
			}
		}

		container_box.appendChild(container_item);
		container_wapper.appendChild(container_box);
		return container_wapper;
	},

	renderUpdateWanData(data, v6) {
		let min_metric = 2000000000;
		let min_metric_i = 0;
		for (let i = 0; i < data.length; i++) {
			const metric = data[i].getMetric();
			if (metric < min_metric) {
				min_metric = metric;
				min_metric_i = i;
			}
		}

		const ifc = data[min_metric_i];
		if (ifc) {
			if (v6) {
				const uptime = ifc.getUptime();
				this.params.internet.v6.uptime.value = (uptime > 0) ? '%t'.format(uptime) : '-';
				this.params.internet.v6.ipprefixv6.value =  ifc.getIP6Prefix() || '-';
				this.params.internet.v6.gatewayv6.value =  ifc.getGateway6Addr() || '-';
				this.params.internet.v6.protocol.value =  ifc.getI18n() || E('em', _('Not connected'));
				this.params.internet.v6.addrsv6.value = ifc.getIP6Addrs() || [ '-' ];
				this.params.internet.v6.dnsv6.value = ifc.getDNS6Addrs() || [ '-' ];
				this.params.internet.v6.connected.value = ifc.isUp();
			} else {
				const uptime = ifc.getUptime();
				this.params.internet.v4.uptime.value = (uptime > 0) ? '%t'.format(uptime) : '-';
				this.params.internet.v4.protocol.value =  ifc.getI18n() || E('em', _('Not connected'));
				this.params.internet.v4.gatewayv4.value =  ifc.getGatewayAddr() || '0.0.0.0';
				this.params.internet.v4.connected.value = ifc.isUp();
				this.params.internet.v4.addrsv4.value = ifc.getIPAddrs() || [ '-'];
				this.params.internet.v4.dnsv4.value = ifc.getDNSAddrs() || [ '-' ];
			}
		}
	},

	renderInternetBox(data) {
		this.params.internet = {
			v4: {
				title: _('IPv4 Internet'),
				connected: { title: _('Connected'), visible: true, value: false },
				uptime: { title: _('Uptime'), visible: true, value: '-' },
				protocol: { title: _('Protocol'), visible: true, value: '-' },
				addrsv4: { title: _('IPv4'), visible: true, value: [ '-' ] },
				gatewayv4: { title: _('GatewayV4'), visible: true, value: '-' },
				dnsv4: { title: _('DNSv4'), visible: true, value: ['-'] }
			},
			v6: {
				title: _('IPv6 Internet'),
				connected: { title: _('Connected'), visible: true, value: false },
				uptime: { title: _('Uptime'), visible: true, value: '-' },
				protocol: { title: _('Protocol'), visible: true, value: ' - ' },
				ipprefixv6 : { title: _('IPv6 prefix'), visible: true, value: ' - ' },
				addrsv6: { title: _('IPv6'), visible: false, value: [ '-' ] },
				gatewayv6: { title: _('GatewayV6'), visible: true, value: '-' },
				dnsv6: { title: _('DNSv6'), visible: true, value: [ '-' ] }
			}
		};

		this.renderUpdateWanData(data[0], false);
		this.renderUpdateWanData(data[1], true);

		return this.renderHtml(this.params.internet, 'internet');
	},

	renderRouterBox(data) {
		const boardinfo   = data[2];
		const systeminfo  = data[3];
		const unixtime    = data[4];

		let datestr = null;

		if (unixtime) {
			const date = new Date(unixtime * 1000);
			const zn = uci.get('system', '@system[0]', 'zonename')?.replaceAll(' ', '_') || 'UTC';
			const ts = uci.get('system', '@system[0]', 'clock_timestyle') || 0;
			const hc = uci.get('system', '@system[0]', 'clock_hourcycle') || 0;

			datestr = new Intl.DateTimeFormat(undefined, {
				dateStyle: 'medium',
				timeStyle: (ts == 0) ? 'long' : 'full',
				hourCycle: (hc == 0) ? undefined : hc,
				timeZone: zn
			}).format(date);
		}

		this.params.router = {
			uptime: { title: _('Uptime'), value: systeminfo.uptime ? '%t'.format(systeminfo.uptime) : null },
			localtime: { title: _('Local Time'), value: datestr },
			kernel: { title: _('Kernel Version'), value: boardinfo.kernel },
			model: { title: _('Model'), value: boardinfo.model },
			system: { title: _('Architecture'), value: boardinfo.system },
			release: { title: _('Firmware Version'), value: boardinfo?.release?.description }
		};

		return this.renderHtml(this.params.router, 'router');
	},

	render(data) {
		return [this.renderInternetBox(data), this.renderRouterBox(data)];
	}
});
