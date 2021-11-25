let f = document.createElement('figment')
f.setAttribute('id', chrome.runtime.id)
document.head.appendChild(f)

var s = document.createElement('script');
s.src = chrome.runtime.getURL('reactMouse.js');

var sty = document.createElement('link');
sty.href = chrome.runtime.getURL('styles.css')
sty.type = 'text/css'
sty.rel = 'stylesheet'
document.head.appendChild(sty)

s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);