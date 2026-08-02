'use strict';
'require baseclass';
'require dom';
'require rpc';
'require uci';
'require network';

const callLuciGetUsers = rpc.declare({
	object: 'luci.natflow',
	method: 'get_users',
	expect: { result: [] }
});

const callBlockUser = rpc.declare({
	object: 'luci.natflow',
	method: 'block_user',
	params: [ 'token' ],
	expect: { result : "OK" },
});

const callAllowUser = rpc.declare({
	object: 'luci.natflow',
	method: 'allow_user',
	params: [ 'token' ],
	expect: { result : "OK" },
});

const callLuciDHCPLeases = rpc.declare({
	object: 'luci-rpc',
	method: 'getDHCPLeases',
	expect: { '': {} }
});

const handleBlockUser = function(ips, ev) {
	const tr = dom.parent(ev.currentTarget, '.tr');
	if (tr) tr.style.opacity = 0.5;
	ev.currentTarget.classList.add('spinning');
	ev.currentTarget.disabled = true;
	ev.currentTarget.blur();
	ips.forEach(ip => callBlockUser(ip));
};

const handleAllowUser = function(ips, ev) {
	const tr = dom.parent(ev.currentTarget, '.tr');
	if (tr) tr.style.opacity = 0.5;
	ev.currentTarget.classList.add('spinning');
	ev.currentTarget.disabled = true;
	ev.currentTarget.blur();
	ips.forEach(ip => callAllowUser(ip));
};

const RE_WIRELESS_IFNAME = /^(wlan|wl|phy|ra|rai|rae|apcli|apclii|apclie|ath|ap|mon|wds|mesh|sta|bat)/i;
const RE_MESH_IFNAME = /^mesh/i;

function isWirelessIfname(ifname) {
	return ifname ? RE_WIRELESS_IFNAME.test(ifname) : false;
}

function rate(n) {
	n = (n || 0).toFixed(2);
	return '%1024.2mbit/s (%1024.2mB/s)'.format(n * 8, n);
}

return baseclass.extend({
	title: _('Active Users'),

	load() {
		return Promise.all([
			network.getHostHints(),
			callLuciGetUsers(),
			network.getWifiNetworks().then(networks => {
				const tasks = networks.map(net =>
					L.resolveDefault(net.getAssocList(), []).then(list => {
						net.assoclist = list || [];
					})
				);
				return Promise.all(tasks).then(() => networks);
			}),
			callLuciDHCPLeases()
		]);
	},

	render(data) {
		const wrapper = E('div', { 'class': 'active-users-self dashboard-bg box-s1', 'style': 'padding: 1.5em; margin-bottom: 20px;' });

		wrapper.appendChild(E('div', { 'class': 'title', 'style': 'text-align: center; margin-bottom: 20px;' }, [
			E('img', {
				'src': L.resource('view/dashboard/icons/devices.svg'),
				'width': 55,
				'title': this.title,
				'class': 'middle svgmonotone',
				'style': 'display: inline-block; vertical-align: middle; margin-right: 10px;'
			}),
			E('h3', { 'style': 'display: inline-block; vertical-align: middle; margin: 0;' }, this.title)
		]));

		if (!document.getElementById('active-users-table-styles')) {
			wrapper.appendChild(E('style', { 'id': 'active-users-table-styles' }, `
				.active-users-table { display: flex !important; flex-direction: column; width: 100%; border: none !important; }
				.active-users-table tbody { display: flex; flex-direction: column; width: 100%; }
				.active-users-table .tr { display: flex; align-items: center; padding: 12px 8px; border-bottom: 1px solid rgba(0,0,0,0.05); transition: opacity 0.3s ease; }
				.active-users-table .table-titles { font-weight: 600; color: #6c757d; background: transparent !important; }
				.active-users-table .td, .active-users-table .th { border: none !important; padding: 8px 10px; word-break: break-all; }

				.active-users-table .th:nth-child(1), .active-users-table .td:nth-child(1) { flex: 1 1 30%; }
				.active-users-table .th:nth-child(2), .active-users-table .td:nth-child(2) { flex: 1 1 25%; }
				.active-users-table .th:nth-child(3), .active-users-table .td:nth-child(3) { flex: 1 1 35%; }
				.active-users-table .th:nth-child(4), .active-users-table .td:nth-child(4) { flex: 0 0 80px; text-align: right; }

				@media screen and (max-width: 800px) {
					.active-users-table .table-titles { display: none !important; }
					.active-users-table .tr:not(.table-titles) {
						flex-direction: row; flex-wrap: wrap; align-items: flex-start;
						background: rgba(0,0,0,0.02); border-radius: 12px; margin-bottom: 12px;
						padding: 12px 16px; border: 1px solid rgba(0,0,0,0.05) !important;
					}
					.active-users-table .td { flex: 1 1 100% !important; text-align: left !important; padding: 4px 0 !important; }

					.active-users-table .td:nth-child(1) { order: 1; flex: 1 1 65% !important; border-bottom: 1px dashed rgba(0,0,0,0.1); padding-bottom: 8px !important; margin-bottom: 8px !important; }
					.active-users-table .td:nth-child(4) { order: 2; flex: 1 1 35% !important; text-align: right !important; border-bottom: 1px dashed rgba(0,0,0,0.1); padding-bottom: 8px !important; margin-bottom: 8px !important; display: flex; justify-content: flex-end; align-items: flex-start; }

					.active-users-table .td:nth-child(2) { order: 3; flex: 1 1 45% !important; background: rgba(255,255,255,0.5); padding: 8px !important; border-radius: 6px 0 0 6px; border-right: 1px solid rgba(0,0,0,0.05); }
					.active-users-table .td:nth-child(3) { order: 4; flex: 1 1 55% !important; background: rgba(255,255,255,0.5); padding: 8px !important; border-radius: 0 6px 6px 0; }
				}

				[data-darkmode="true"] .active-users-table .tr:not(.table-titles) { background: rgba(255,255,255,0.03); }
				[data-darkmode="true"] .active-users-table .td:nth-child(2), [data-darkmode="true"] .active-users-table .td:nth-child(3) { background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.05); }
			`));
		}

		const table = E('table', { 'class': 'table modern-flex-table active-users-table', 'id': 'users' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, [ _('Device Info') ]),
				E('th', { 'class': 'th' }, [ _('Connection') ]),
				E('th', { 'class': 'th' }, [ _('Traffic (RX / TX)') ]),
				E('th', { 'class': 'th cbi-section-actions' }, [ _('Internet') ])
			]),
			E('tr', { 'class': 'tr placeholder' }, [
				E('td', { 'class': 'td' }, [
					E('em', {}, [ _('Collecting data...') ])
				])
			])
		]);

		const hosts = data[0];
		const rawUsers = Array.isArray(data[1]) ? data[1] : [];
		const wifiNetworks = data[2] || [];
		const dhcpData = data[3] || {};
		const dhcpLeases = dhcpData.dhcp_leases || [];

		// MAC 按网卡特征聚合多 IP 记录
		const mergedUsersMap = {};
		for (let i = 0; i < rawUsers.length; i++) {
			const u = rawUsers[i];
			if (!u || !u.mac) continue;
			const mac = u.mac.toUpperCase();

			if (!mergedUsersMap[mac]) {
				mergedUsersMap[mac] = {
					mac: mac,
					ips: [ u.ip ],
					rx_bytes: u.rx_bytes || 0,
					tx_bytes: u.tx_bytes || 0,
					rx_speed_bytes: u.rx_speed_bytes || 0,
					tx_speed_bytes: u.tx_speed_bytes || 0,
					status: u.status,
					ifname: u.ifname || ''
				};
			} else {
				const userObj = mergedUsersMap[mac];
				if (u.ip && userObj.ips.indexOf(u.ip) === -1) {
					userObj.ips.push(u.ip);
				}
				userObj.rx_bytes += (u.rx_bytes || 0);
				userObj.tx_bytes += (u.tx_bytes || 0);
				userObj.rx_speed_bytes += (u.rx_speed_bytes || 0);
				userObj.tx_speed_bytes += (u.tx_speed_bytes || 0);
				if (u.status == 6) {
					userObj.status = 6;
				}
				// 若之前的 ifname 为空或非无线，而新记录有无线 ifname，则优先采用无线 ifname
				if (u.ifname && (!userObj.ifname || (!isWirelessIfname(userObj.ifname) && isWirelessIfname(u.ifname)))) {
					userObj.ifname = u.ifname;
				}
			}
		}

		const users = Object.values(mergedUsersMap);
		users.sort((a, b) => b.rx_bytes - a.rx_bytes);

		const wifiClientsMap = {};
		const wifiIfnamesMap = {};

		for (let i = 0; i < wifiNetworks.length; i++) {
			const net = wifiNetworks[i];
			const ssid = net.getActiveSSID() || '?';
			const freq = parseFloat(net.getFrequency());
			let band = '';
			if (!isNaN(freq)) {
				if (freq >= 2.4 && freq < 3.0) band = '2.4G';
				else if (freq >= 5.0 && freq < 6.0) band = '5.8G';
				else if (freq >= 6.0 && freq < 7.0) band = '6G';
			}

			const ifnames = [];
			const collectIfname = function(name) {
				if (name && typeof name === 'string' && ifnames.indexOf(name) === -1) {
					ifnames.push(name);
				}
			};

			collectIfname(net.getIfname());
			collectIfname(net.ubus('net', 'ifname'));
			collectIfname(net.ubus('net', 'iwinfo', 'ifname'));
			collectIfname(net.ubus('net', 'device'));
			collectIfname(net.ubus('dev', 'ifname'));
			collectIfname(net.ubus('hostapd', 'ifname'));

			const vlans = net.getVlanIfnames();
			if (Array.isArray(vlans)) {
				for (let k = 0; k < vlans.length; k++) {
					collectIfname(vlans[k]);
				}
			}

			try {
				const devObj = net.getDevice();
				if (devObj && devObj.getName) {
					collectIfname(devObj.getName());
				}
			} catch(e) {}

			const info = {
				ssid: ssid,
				band: band,
				ifnames: ifnames
			};

			for (let k = 0; k < ifnames.length; k++) {
				wifiIfnamesMap[ifnames[k]] = info;
			}

			const list = net.assoclist || [];
			for (let j = 0; j < list.length; j++) {
				const bss = list[j];
				if (bss && bss.mac) {
					wifiClientsMap[bss.mac.toUpperCase()] = {
						ssid: ssid,
						band: band,
						signal: bss.signal,
						noise: bss.noise,
						ifnames: ifnames
					};
				}
			}
		}

		const leaseMap = {};
		for (let k = 0; k < dhcpLeases.length; k++) {
			const lease = dhcpLeases[k];
			if (lease && lease.macaddr) {
				leaseMap[lease.macaddr.toUpperCase()] = lease.expires;
			}
		}

		const rows = users.map(u => {
			const mac = u.mac.toUpperCase();
			const name = hosts.getHostnameByMACAddr(mac);

			let expNode = '';
			if (leaseMap[mac] !== undefined) {
				const expires = leaseMap[mac];
				if (expires === false)
					expNode = E('em', _('unlimited'));
				else if (expires <= 0)
					expNode = E('em', _('expired'));
				else
					expNode = '%t'.format(expires);
			}

			// 列 1：设备名 + MAC
			const nodeDeviceInfo = E('div', {}, [
				E('div', { 'style': 'font-weight: 600; font-size: 14px;' }, name || '?'),
				E('div', { 'class': 'text-muted', 'style': 'font-family: monospace; font-size: 12px; opacity: 0.7;' }, mac)
			]);

			u.ips.forEach(ipStr => {
				nodeDeviceInfo.appendChild(
					E('div', { 'style': 'font-family: monospace; font-size: 13px; margin-top: 3px; color: var(--bs-info, #0dcaf0); word-break: break-all;' }, ipStr)
				);
			});

			if (expNode !== '') {
				nodeDeviceInfo.appendChild(
					E('div', { 'style': 'font-size: 11px; color: #6c757d; margin-top: 3px;' }, [
						E('span', { 'style': 'opacity: 0.8; margin-right: 2px;' }, '⏳ '),
						expNode
					])
				);
			}

			// 列 2：接入信息逻辑
			let nodeConnection;
			const wInfo = wifiClientsMap[mac];
			const wIfInfo = u.ifname ? (wifiIfnamesMap[u.ifname] || null) : null;
			const isWifi = !!wInfo || !!wIfInfo || isWirelessIfname(u.ifname);
			const isMesh = u.ifname && RE_MESH_IFNAME.test(u.ifname);
			const labelStr = isMesh ? _('Wireless Mesh') : _('Wireless');

			if (wInfo) {
				const defaultNF = -90;
				const defaultCeil = -30;
				const noise = wInfo.noise || defaultNF;
				const q = Math.max(0, Math.min(100, 100 * ((wInfo.signal - noise) / (defaultCeil - noise))));
				const qColor = (q < 25) ? '#dc3545' : ((q < 50) ? '#ffc107' : '#198754');

				nodeConnection = E('div', {}, [
					E('div', { 'style': 'display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 4px; background: rgba(13, 110, 253, 0.1); color: #0d6efd; margin-bottom: 4px;' }, wInfo.band ? '%s %s'.format(labelStr, wInfo.band) : labelStr),
					E('div', { 'style': 'font-size: 13px; font-weight: 600;' }, wInfo.ssid),
					E('div', { 'style': 'font-size: 12px; margin-top: 2px; color: #6c757d;' }, [
						E('span', { 'style': `display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${qColor}; margin-right: 5px;` }),
						`${wInfo.signal} dBm (${parseInt(q)}%)`
					])
				]);
			} else if (wIfInfo) {
				nodeConnection = E('div', {}, [
					E('div', { 'style': 'display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 4px; background: rgba(13, 110, 253, 0.1); color: #0d6efd; margin-bottom: 4px;' }, wIfInfo.band ? '%s %s'.format(labelStr, wIfInfo.band) : labelStr),
					E('div', { 'style': 'font-size: 13px; font-weight: 600;' }, wIfInfo.ssid),
					E('div', { 'style': 'font-size: 12px; margin-top: 2px; color: #6c757d;' }, u.ifname)
				]);
			} else if (isWifi) {
				nodeConnection = E('div', {}, [
					E('div', { 'style': 'display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 4px; background: rgba(13, 110, 253, 0.1); color: #0d6efd; margin-bottom: 4px;' }, labelStr),
					E('div', { 'style': 'font-size: 13px; font-weight: 600;' }, u.ifname)
				]);
			} else {
				nodeConnection = E('div', {}, [
					E('div', { 'style': 'display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 4px; background: rgba(25, 135, 84, 0.1); color: #198754; margin-bottom: 4px;' }, _('Wired')),
					E('div', { 'style': 'font-size: 13px; color: #6c757d; margin-top: 2px;' }, u.ifname || 'LAN')
				]);
			}

			// 列 3：聚合后的 RX 和 TX 流量
			const nodeTraffic = E('div', { 'style': 'display: flex; gap: 10px; flex-direction: column;' }, [
				E('div', {}, [
					E('div', { 'style': 'color: var(--bs-success, #198754); font-weight: 600; font-size: 13px;' }, [ E('span', '↓ '), '%1024.2mB'.format(u.rx_bytes) ]),
					E('div', { 'style': 'font-size: 11px; opacity: 0.7; margin-top: 2px;' }, rate(u.rx_speed_bytes))
				]),
				E('div', {}, [
					E('div', { 'style': 'color: var(--bs-primary, #0d6efd); font-weight: 600; font-size: 13px;' }, [ E('span', '↑ '), '%1024.2mB'.format(u.tx_bytes) ]),
					E('div', { 'style': 'font-size: 11px; opacity: 0.7; margin-top: 2px;' }, rate(u.tx_speed_bytes))
				])
			]);

			// 列 4：按钮逻辑
			const isBlocked = (u.status == 6);
			const btnText = isBlocked ? _('Disabled') : _('Enabled');
			const btnClass = isBlocked ? 'btn cbi-button-negative' : 'btn cbi-button-positive';
			const btnHandler = isBlocked ? handleAllowUser : handleBlockUser;

			const nodeBtn = E('button', {
				'class': 'btn ' + btnClass,
				'style': 'padding: 4px 10px; font-size: 12px; border-radius: 4px; min-width: 60px;',
				'click': L.bind(btnHandler, this, u.ips)
			}, [ btnText ]);

			return [ nodeDeviceInfo, nodeConnection, nodeTraffic, nodeBtn ];
		});

		cbi_update_table(table, rows, E('em', _('No information available')));

		wrapper.appendChild(table);
		return wrapper;
	}
});
