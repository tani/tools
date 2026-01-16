const nop = () => {};

const proxy = new Proxy(nop, {
	get: (_target, prop) => {
		if (prop === "__esModule") return true;
		return proxy;
	},
});

module.exports = proxy;
