//add the extension id to the dom so we know where to send messages
let f = document.createElement('figment')
f.setAttribute('id', chrome.runtime.id)
document.head.appendChild(f)

//add styles we can use from the dom
var sty = document.createElement('link');
sty.href = chrome.runtime.getURL('styles.css')
sty.type = 'text/css'
sty.rel = 'stylesheet'
document.head.appendChild(sty)

//add our script that needs dom context access
var s = document.createElement('script');
s.src = chrome.runtime.getURL('Figment.js');
s.setAttribute('type', 'module');

//cleanup 
s.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);