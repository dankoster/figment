# Figment

A developer tool to correlate React components and Figma designs


# Features
* Highlight React components under the mouse
* Click the highlight label to see a menu showing the tree of components under the mouse and a listing of Figma frames with matching names
* Hover over a react node name to highlight that node on the page
* Click a react node name in the menu to search figma for that name
* Click a code file to open it in Visual Studio code
* Hover over a figma reference to see a preview image 
* Click a Figma reference to open the figma document to that point

# TODO
* React node "rendered by" submenu
	* When hovering over a non-host component, highlight the next HostComponent up the tree
	* When clicking a compnent name, highlight the figma search terms
* Popup
	* Multiple Figma files
	* Figma Frame search box (don't require clicking on a node)
* Enable/Disable from context menu
* Configurable file open target (VSCode, VIM, etc)
* Add support for other design tools? (whimsical?)
* Add shadow dom for menu
* Better icon(s)

# Install
1) Load the extension in a chromium browser
1) Open a figma document and get a user token
1) Add the document name, id, and your token in the popup
1) Click "load figma doc"
