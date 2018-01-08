/* global fetch, Redirectioni10n */
/**
 * Internal dependencies
 */
import querystring from 'querystring';

const removeEmpty = item => Object.keys( item ).filter( key => item[ key ] ).reduce( ( newObj, key ) => {
	newObj[ key ] = item[ key ];
	return newObj;
}, {} );

const getRedirectionUrl = ( path, params ) => {
	const base = Redirectioni10n.WP_API_root + 'redirection/v1/' + path;

	if ( params && Object.keys( params ).length > 0 ) {
		params = removeEmpty( params );

		if ( Object.keys( params ).length > 0 ) {
			return base + ( Redirectioni10n.WP_API_root.indexOf( '?' ) === -1 ? '?' : '&' ) + querystring.stringify( params );
		}
	}

	return base;
};

const apiRequest = url => ( {
	url,
	headers: new Headers( {
		'X-WP-Nonce': Redirectioni10n.WP_API_nonce,
		'Content-Type': 'application/json',
	} ),
	credentials: 'same-origin',
} );

const deleteApiRequest = ( path, params ) => ( { ... apiRequest( getRedirectionUrl( path, params ) ), method: 'delete' } );
const getApiRequest = ( path, params = {} ) => ( { ... apiRequest( getRedirectionUrl( path, params ) ), method: 'get' } );
const uploadApiRequest = ( path, file ) => {
	const request = { ... apiRequest( getRedirectionUrl( path ) ), method: 'post' };

	request.headers.delete( 'Content-Type' );
	request.body = new FormData();
	request.body.append( 'file', file );

	return request;
};

const postApiRequest = ( path, params = {}, query = {} ) => {
	const request = { ... apiRequest( getRedirectionUrl( path, query ) ), method: 'post', params };

	if ( Object.keys( params ).length > 0 ) {
		request.body = JSON.stringify( params );
	}

	return request;
};

export const RedirectionApi = {
	setting: {
		get: () => getApiRequest( 'setting' ),
		update: settings => postApiRequest( 'setting', settings ),
	},
	redirect: {
		list: data => getApiRequest( 'redirect', data ),
		update: ( id, data ) => postApiRequest( 'redirect/' + id, data ),
		create: data => postApiRequest( 'redirect', data ),
	},
	group: {
		list: data => getApiRequest( 'group', data ),
		update: ( id, data ) => postApiRequest( 'group/' + id, data ),
		create: data => postApiRequest( 'group', data ),
	},
	log: {
		list: data => getApiRequest( 'log', data ),
		deleteAll: data => deleteApiRequest( 'log', data ),
	},
	error: {
		list: data => getApiRequest( '404', data ),
		deleteAll: data => deleteApiRequest( '404', data ),
	},
	import: {
		get: () => getApiRequest( 'import' ),
		upload: ( group, file ) => uploadApiRequest( 'import/file/' + group, file ),
		pluginList: () => getApiRequest( 'import/plugin' ),
		pluginImport: plugin => postApiRequest( 'import/plugin/' + plugin ),
	},
	export: {
		file: ( module, format ) => getApiRequest( 'export/' + module + '/' + format ),
	},
	plugin: {
		status: () => getApiRequest( 'plugin' ),
		fix: () => postApiRequest( 'plugin' ),
		delete: () => deleteApiRequest( 'plugin' ),
	},
	bulk: {
		redirect: ( action, data, table ) => postApiRequest( 'bulk/redirect/' + action, data, table ),
		group: ( action, data, table ) => postApiRequest( 'bulk/group/' + action, data, table ),
		log: ( action, data, table ) => postApiRequest( 'bulk/log/' + action, data, table ),
		error: ( action, data, table ) => postApiRequest( 'bulk/404/' + action, data, table ),
	},
};

export const RedirectLiApi = {
	ip: {
		getGeo: ip => ( {
			url: 'https://api.redirect.li/v1/ip/' + ip + '?ref=redirection&locale=' + Redirectioni10n.localeSlug.substr( 0, 2 ),
			method: 'get',
		} ),
	},
};

export const getApi = request => {
	return fetch( request.url, request )
		.then( data => {
			if ( ! data || ! data.status ) {
				throw { message: 'No data or status object returned in request', code: 0 };
			}

			if ( data.status && data.statusText !== undefined ) {
				request.status = data.status;
				request.statusText = data.statusText;
				request.action = data.url.replace( Redirectioni10n.WP_API_root, '' ) + ' ' + request.method.toUpperCase();
			}

			if ( data.headers.get( 'x-wp-nonce' ) ) {
				Redirectioni10n.WP_API_nonce = data.headers.get( 'x-wp-nonce' );
			}

			return data.text();
		} )
		.then( text => {
			request.raw = text;

			try {
				const json = JSON.parse( text );

				if ( request.status !== 200 ) {
					throw { message: json.message, code: json.error_code ? json.error_code : json.data.error_code, request, data: json.data };
				}

				return json;
			} catch ( error ) {
				error.request = request;
				throw error;
			}
		} );
};
