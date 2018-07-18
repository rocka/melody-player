// https://codepen.io/caesarsol/pen/dNejPG
// JSX for document.createElement()

export default function h(name, attr, ...children) {
    const elm = document.createElement(name);

    if (attr) {
        Object.entries(attr).forEach(([k, v]) => {
            if (k === 'ref') {
                v(elm);
                return;
            }
            switch (typeof v) {
                case 'string':
                    elm.setAttribute(k, v);
                    break;
                case 'function':
                    const ev = k.replace(/^on/, '').toLowerCase(); // eslint-disable-line no-case-declarations
                    elm.addEventListener(ev, v);
                    break;
            }
        });
    }

    children.forEach(child => {
        if (typeof child === 'string') {
            elm.appendChild(document.createTextNode(child));
        } else {
            elm.appendChild(child);
        }
    });

    return elm;
}
