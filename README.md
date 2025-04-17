# Family Tree Visualization

A web-based family tree visualization tool built with D3.js that displays family relationships in an interactive tree layout.

## Features

* Interactive family tree visualization with D3.js
* Collapsible nodes with '+' indicators for nodes with children
* Color-coded nodes (green for single, red for married)
* Names displayed below each node
* Smooth animations for expanding/collapsing
* Automatic centering on clicked nodes
* Responsive design that adapts to window size

## Project Structure

```
website_ui/
├── generate_name_list.py  # Python script to process family data
├── index.html            # Main HTML file
├── graph.js             # D3.js visualization code
├── name_list.json       # Generated family tree data
└── .gitignore          # Git ignore configuration
```

## Setup and Running

1. Process the family data:
```bash
python3 generate_name_list.py
```

2. Start a local server:
```bash
python3 -m http.server 8080
```

3. Open your browser and visit:
```
http://localhost:8080
```

## Technologies Used

* HTML5
* CSS3
* JavaScript
* D3.js (v7)
* Python 3
* Git

## License

MIT License 