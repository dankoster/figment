import { element } from "./html.js";

export class SidePanelTab {
	title;
	body;
	tab;
	bodyClass = 'tab-body';

	constructor(title: HTMLElement, body?: HTMLElement) {
		console.log('SidePanelTab');
		this.title = title;
		this.body = body;

		this.tab = element('div', { className: 'tab' });
		this.tab.appendChild(title)
		this.tab.addEventListener('click', () => this.setActive());

		this.#tabs.appendChild(this.tab);
		this.setTabBody(body);
	}

	get #tabs() {
		const tabs = document.getElementById('tabs');
		if (!tabs) throw new Error('missing element with id "tabs"');
		return tabs;
	}

	setActive() {
		for (const child of this.#tabs.children) {
			if (child === this.tab) child.classList.add('active');
			else child.classList.remove('active');
		}

		const tabBody = document.querySelector(`.${this.bodyClass}`);
		if (!tabBody) throw new Error(`missing element with class "${this.bodyClass}"`);
		if (this.body) {
			tabBody.replaceWith(this.body);
			if (!this.body.classList.contains(this.bodyClass)) {
				this.body.classList.add(this.bodyClass);
			}
		}
	}

	setTabBody(body?: HTMLElement) {
		this.body = body;
	}
}
