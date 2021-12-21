# Figment

A developer tool to correlate React components and Figma designs


# Features
* Highlight React components under the mouse
* Click the highlight label to see a menu showing the tree of components under the mouse and a listing of Figma frames with matching names
* Click a code file to open it in Visual Studio code
* Click a Figma reference to open the figma document to that point

# TODO
* WIP - react node "rendered by" submenu
* Enable/Disable from popup
* Figma images
* Multiple Figma files
* Figma Frame search box (don't require clicking on a node)
* Configurable file open target (VSCode, VIM, etc)
* Add support for other design tools? (whimsical?)

# Install
1) Load the extension in a chromium browser
1) Open a figma document and get a user token
1) Add the document name, id, and your token in the popup
1) Click "load figma doc"
