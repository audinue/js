(function () {
	const loaders   = [loadJs, loadCss, loadJson, loadText]
	const factories = {}
	const modules   = {}
	const main      = document.currentScript.getAttribute('main')

	if (!main) {
		throw new Error(`Missing main attribute.`)
	}

	const id = resolve(main, location.href)

	preload(id)
		.then(function () {
			require(id)
		})

	function require (id) {
		let module = modules[id]
		if (!module) {
			module = { exports: {} }
			factories[id](module, module.exports, require)
			modules[id] = module
		}
		return module.exports
	}

	async function preload (id, preloaded = {}) {
		if (!preloaded[id]) {
			preloaded[id] = true
			const module = await compile(id)
			factories[id] = module.factory
			for (const child of module.children) {
				await preload(child, preloaded)
			}
		}
	}

	async function compile (id) {
		const children = []
		const factory = await load(id)
		if (typeof factory === 'function') {
			return { factory, children }
		}
		return {
			factory: new Function(
				'module',
				'exports',
				'require',
				factory.replace(
					/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gi,
					function (_, path) {
						const child = resolve(path, id)
						children.push(child)
						return `require("${child}")`
					}
				)
			),
			children
		}
	}

	async function load (id) {
		for (const loader of loaders) {
			const result = await loader(id)
			if (result) {
				return result
			}
		}
		throw new Error(`No loader found for "${id}"`)
	}

	function resolve (path, base) {
		return new URL(path, base).toString()
	}

	async function loadJs (id) {
		if (/\.m?js$/i.test(id)) {
			const response = await fetch(id)
			if (response.ok) {
				const code = await response.text()
				return transform(code)
			} else {
				throw new Error(`Unable to load CSS "${id}"`)
			}
		}
	}

	function transform (code) {
		let eof = ''
		return code.replace(
			/\bimport(?:(?:\s+([a-z_$][a-z0-9_$]*)\s+from\s*(['"][^'"]+['"]))|(?:\s*(?:(['"][^'"]+['"])|(?:\*\s*as\s+([a-z_$][a-z0-9_$]*)\s+from\s*(['"][^'"]+['"]))|(?:({[^}]+})\s*from\s*(['"][^'"]+['"])))))|\bexport(?:(?:\s+(?:((?:var|let|const|function|class)\s+)([a-z_$][a-z0-9_$]*)|(default)))|(?:\s*(?:({[^}]+})\s*from\s*(['"][^'"]+['"])|(?:({[^}]+}))|(?:\*\s*as\s+([a-z_$][a-z0-9_$]*)\s+from\s*(['"][^'"]+['"]))|(?:\*\s*from\s*(['"][^'"]+['"])))))/ig,
			function ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) {
				if ($1) {
					return 'const ' + $1 + '=require(' + $2 + ').default'
				}
				if ($3) {
					return 'require(' + $3 + ')'
				}
				if ($4) {
					return 'const ' + $4 + '=require(' + $5 + ')'
				}
				if ($6) {
					return 'const' + $6.replace(/\bas\b/g, ':') + '=require(' + $7 + ')'
				}
				if ($8) {
					eof += '\nexports.' + $9 + '=' + $9
					return $8 + $9
				}
				if ($10) {
					return 'exports.default='
				}
				if ($11) {
					return parse($11)
						.map(function ([target, source]) {
							return 'exports.' + target + '=require(' + $12 + ').' + source
						})
						.join(';')
				}
				if ($13) {
					return parse($13)
						.map(function ([target, source]) {
							return 'exports.' + target + '=' + source
						})
						.join(';')
				}
				if ($14) {
					return 'exports.' + $14 + '=require(' + $15 + ')'
				}
				if ($16) {
					return 'Object.assign(exports,require(' + $16 + '))'
				}
			}
		) + eof
	}

	async function loadCss (id) {
		if (/\.css$/i.test(id)) {
			const response = await fetch(id)
			if (response.ok) {
				const text = await response.text()
				return function (module) {
					module.exports.default = document.head.appendChild(
						Object.assign(
							document.createElement('style'),
							{
								textContent: text.replace(
									/url\(['"]?(.+?)['"]?\)/gi,
									function (_, path) {
										return `url(${resolve(path, id)})`
									}
								)
							}
						)
					)
				}
			} else {
				throw new Error(`Unable to load CSS "${id}"`)
			}
		}
	}

	async function loadJson (id) {
		if (/\.json$/i.test(id)) {
			const response = await fetch(id)
			if (response.ok) {
				const json = await response.json()
				return function (module) {
					module.exports.default = json
				}
			} else {
				throw new Error(`Unable to load JSON "${id}"`)
			}
		}
	}

	async function loadText (id) {
		if (/\.txt$/i.test(id)) {
			const response = await fetch(id)
			if (response.ok) {
				const text = await response.text()
				return function (module) {
					module.exports.default = text
				}
			} else {
				throw new Error(`Unable to load text "${id}"`)
			}
		}
	}
})()
