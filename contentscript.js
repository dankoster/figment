let f = document.createElement('figment')
f.setAttribute('id', chrome.runtime.id)
document.head.appendChild(f)

var s = document.createElement('script');
s.src = chrome.runtime.getURL('reactMouse.js');
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);