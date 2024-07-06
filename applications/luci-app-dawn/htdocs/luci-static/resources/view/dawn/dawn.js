'use strict';
'require view';
'require rpc';
'require poll';
'require dom';
'require ui';
'require form';
'require uci';
'require dawn.dawn-common as dawn';

var dawnHearingMapData,dawnNetworkData,hostHintsData;
var NetworkOverview = form.DummyValue.extend({
	renderWidget: function() {
		if (!dawnNetworkData) {
			return dawn.getDawnServiceNotRunningErrorMessage();
		}

		let client_table = {};

		var body = E([
			E('h3', _('Network Overview'))
		]);

		for (let network in dawnNetworkData) {

			body.appendChild(
				E('h4', 'SSID: ' + network)
			);

			let ap_table = E('table', { 'class': 'table cbi-section-table' }, [
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th left cbi-section-actions' }, _('Access Point')),
					E('th', { 'class': 'th left cbi-section-actions' }, _('Interface')),
					E('th', { 'class': 'th left cbi-section-actions' }, _('MAC')),
					E('th', { 'class': 'th left cbi-section-actions' }, _('Utilization')),
					E('th', { 'class': 'th left cbi-section-actions' }, _('Frequency')),
					E('th', { 'class': 'th left cbi-section-actions' }, _('Stations Connected')),
					E('th', { 'class': 'th left cbi-section-actions' }, E('span', { 'data-tooltip': _('High Throughput') }, [ _('HT') ])),
					E('th', { 'class': 'th left cbi-section-actions' }, E('span', { 'data-tooltip': _('Very High Throughput') }, [ _('VHT') ])),
					E('th', { 'class': 'th center cbi-section-actions' }, _('Clients')),
				])
			]);

			let aps = Object.entries(dawnNetworkData[network]).map(function(ap) {
				client_table[ap[0]] = E('table', { 'class': 'table cbi-section-table', 'style': 'display: table' }, [
					E('tr', { 'class': 'tr table-titles' }, [
						E('th', { 'class': 'th' }, _('Client')),
						E('th', { 'class': 'th' }, E('span', { 'data-tooltip': _('High Throughput') }, [ _('HT') ])),
						E('th', { 'class': 'th' }, E('span', { 'data-tooltip': _('Very High Throughput') }, [ _('VHT') ])),
						E('th', { 'class': 'th' }, _('Signal'))
					])
				]);

				let clients = [];
				let clientData = Object.entries(ap[1]);
				for (let i = 0; i < clientData.length; i++) {
					if (typeof clientData[i][1] === 'object') {
						clients.push([
							dawn.getHostnameFromMAC(hostHintsData ,clientData[i][0]),
							dawn.getAvailableText(clientData[i][1].ht),
							dawn.getAvailableText(clientData[i][1].vht),
							clientData[i][1].signal
						]);
					}
				}

				cbi_update_table(client_table[ap[0]], clients, E('em', _('No clients connected.')));

				return [
					ap[1].hostname,
					ap[1].iface,
					ap[0],
					dawn.getFormattedNumber(ap[1].channel_utilization, 2, 2.55) + '%',
					dawn.getFormattedNumber(ap[1].freq, 3, 1000) + ' GHz (' + _('Channel') + ': ' + dawn.getChannelFromFrequency(ap[1].freq) + ')',
					ap[1].num_sta,
					dawn.getAvailableText(ap[1].ht_support),
					dawn.getAvailableText(ap[1].vht_support),
					ap[1].num_sta > 0 ? client_table[ap[0]] : E('em', { 'style': 'display: inline' }, _('No clients connected.'))
				]
			});

			cbi_update_table(ap_table, aps, E('em', _('No access points available.')));

			body.appendChild(ap_table);
		}

		return E('div', { 'class': 'cbi-section cbi-tblsection' }, [body]);
	}
});

var HearingMap = form.DummyValue.extend({
	renderWidget: function() {
		if (!dawnHearingMapData || !dawnNetworkData) {
			return dawn.getDawnServiceNotRunningErrorMessage();
		}

		let accessPointsHintsData = {};
		let connectedClients = {};
		for (let network in dawnNetworkData) {
			connectedClients[network] = [];
			let aps = Object.entries(dawnNetworkData[network]).map(function(ap) {
				accessPointsHintsData[ap[0]] = {name: ap[1].hostname};
				let clientData = Object.entries(ap[1]);
				for (let i = 0; i < clientData.length; i++) {
					if (typeof clientData[i][1] === 'object') {
						connectedClients[network].push(clientData[i][0]);
					}
				}
			});
		}

		var body = E([
			E('h3', _('Hearing Map'))
		]);

		for (let network in dawnHearingMapData) {

			body.appendChild(
				E('h4', 'SSID: ' + network)
			);

			let hearing_map_table = E('table', { 'class': 'table cbi-section-table' }, [
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, _('Client')),
					E('th', { 'class': 'th' }, _('Access Point')),
					E('th', { 'class': 'th' }, _('Frequency')),
					E('th', { 'class': 'th' }, E('span', { 'data-tooltip': _('High Throughput') }, [ _('HT') ])),
					E('th', { 'class': 'th' }, E('span', { 'data-tooltip': _('Very High Throughput') }, [ _('VHT') ])),
					E('th', { 'class': 'th' }, _('Signal')),
					E('th', { 'class': 'th' }, E('span', { 'data-tooltip': _('Received Channel Power Indication') }, [ _('RCPI') ])),
					E('th', { 'class': 'th' }, E('span', { 'data-tooltip': _('Received Signal to Noise Indicator') }, [ _('RSNI') ])),
					E('th', { 'class': 'th' }, _('Channel Utilization')),
					E('th', { 'class': 'th' }, _('Connected to Network')),
					E('th', { 'class': 'th' }, _('Score'))
				])
			]);

			let clients = Object.entries(dawnHearingMapData[network]).map(function(client) {

				return Object.entries(client[1]).map(function(ap) {

					if (ap[1].freq != 0) {
						return [
							dawn.getHostnameFromMAC(hostHintsData, client[0]),
							dawn.getHostnameFromMAC(accessPointsHintsData, ap[0]),
							dawn.getFormattedNumber(ap[1].freq, 3, 1000) + ' GHz (' + _('Channel') + ': ' + dawn.getChannelFromFrequency(ap[1].freq) + ')',
							dawn.getAvailableText(ap[1].ht_capabilities && ap[1].ht_support),
							dawn.getAvailableText(ap[1].vht_capabilities && ap[1].vht_support),
							ap[1].signal,
							ap[1].rcpi,
							ap[1].rsni,
							dawn.getFormattedNumber(ap[1].channel_utilization, 2, 2.55) + '%',
							dawn.getYesText(connectedClients[network].includes(client[0])),
							ap[1].score
						]
					}
					return undefined;
				})

			}).flat();
			clients = clients.filter(client => client !== undefined);

			cbi_update_table(hearing_map_table, clients, E('em', _('No clients connected.')));

			body.appendChild(hearing_map_table);
		}

		return E('div', { 'class': 'cbi-section cbi-tblsection' }, [body]);
	}
});

return view.extend({
	handleSaveApply: null,
	handleSave: null,
	handleReset: null,

	load: function() {
		return Promise.all([
			dawn.isDawnRPCAvailable().then(function(isAvailable) {
				return ( isAvailable ? dawn.callDawnGetHearingMap() : null )
			}),
			dawn.isDawnRPCAvailable().then(function(isAvailable) {
				return ( isAvailable ? dawn.callDawnGetNetwork() : null )
			}),
			dawn.callHostHints()
		]);
	},

	render: function(data) {
		var m, s, o;
		dawnHearingMapData = data[0];
		dawnNetworkData = data[1];
		hostHintsData = data[2];

		m = new form.Map('dawn', _('DAWN'));

		s = m.section(form.TypedSection, 'local');
		s.anonymous = true;
		s.tab("network_overview", _("Network Overview"));
		s.tab('hearingmap', _("Hearing map"));

		o = s.taboption('network_overview',NetworkOverview);
		o = s.taboption('hearingmap',HearingMap);

		return m.render();
	}
});
