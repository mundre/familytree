import json
import re
import os
from collections import defaultdict

def generate_html_tree(root_node):
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Family Tree</title>
        <script src="https://d3js.org/d3.v7.min.js"></script>
        <style>
            body {
                margin: 0;
                padding: 0;
                overflow: hidden;
            }
            #tree {
                width: 100vw;
                height: 100vh;
            }
            .link {
                fill: none;
                stroke: #ccc;
                stroke-width: 2px;
            }
            .node circle {
                fill: white;
                stroke: steelblue;
                stroke-width: 2px;
            }
            .node circle.married {
                fill: #ff9999;
            }
            .node circle.single {
                fill: #99ff99;
            }
            .node {
                cursor: pointer;
            }
            .node text {
                font: 14px sans-serif;
                pointer-events: none;
            }
            .name-label {
                fill: black;
            }
            .expand-symbol {
                font-weight: bold;
                fill: #666;
                user-select: none;
            }
        </style>
    </head>
    <body>
        <div id="tree"></div>
        <script src="graph.js"></script>
        <script>
            const data = """ + json.dumps(root_node) + """;
            // Data will be loaded by graph.js
        </script>
    </body>
    </html>
    """
    return html

def parse_family_tree(file_path):
    name_map = {}  # Map of ID to name
    root_node = {"name": "Top of Family", "id": "0", "children": []}
    nodes = {"0": root_node}  # Map of ID to node
    
    # Create root hierarchy
    ramananda = {"name": "Ramananda", "id": "0-1", "children": []}
    shreekrishna = {"name": "Shreekrishna", "id": "0-1-1", "children": []}
    kantu = {"name": "Kantu", "id": "0-1-1-1", "children": []}
    jayalal = {"name": "Jayalal", "id": "0-1-1-1-1", "children": []}
    
    root_node["children"].append(ramananda)
    ramananda["children"].append(shreekrishna)
    shreekrishna["children"].append(kantu)
    kantu["children"].append(jayalal)
    
    nodes["0-1"] = ramananda
    nodes["0-1-1"] = shreekrishna
    nodes["0-1-1-1"] = kantu
    nodes["0-1-1-1-1"] = jayalal
    
    discrepancies = []
    
    with open(file_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
                
            # Split on the last space to separate name from ID
            parts = line.rsplit(' ', 1)
            if len(parts) != 2:
                continue
                
            name, id_str = parts
            name = name.strip()
            id_str = id_str.strip()
            
            # Skip if this is just a section header
            if not name or not id_str or id_str.startswith('Section'):
                continue
                
            # Store name in map
            name_map[id_str] = name
            
            # Create node if it doesn't exist
            if id_str not in nodes:
                nodes[id_str] = {"name": name, "id": id_str, "children": []}
            else:
                nodes[id_str]["name"] = name
            
            # Find parent ID
            parent_id = '-'.join(id_str.split('-')[:-1])
            
            # If no parent ID, this is a child of Jayalal
            if not parent_id or not parent_id.strip():
                jayalal["children"].append(nodes[id_str])
                continue
                
            # Create parent node if it doesn't exist
            if parent_id not in nodes:
                parent_name = name_map.get(parent_id, "")
                nodes[parent_id] = {"name": parent_name, "id": parent_id, "children": []}
                
                # Check for missing child numbers
                child_num = int(id_str.split('-')[-1])
                existing_children = [int(n["id"].split('-')[-1]) for n in nodes[parent_id]["children"]]
                missing_nums = [n for n in range(1, child_num) if n not in existing_children]
                
                if missing_nums:
                    discrepancy = {
                        "type": "missing_child_numbers",
                        "parent_id": parent_id,
                        "parent_name": parent_name,
                        "missing_numbers": missing_nums,
                        "source_line": line
                    }
                    discrepancies.append(discrepancy)
            
            # Add node to parent's children if not already there
            parent_node = nodes[parent_id]
            if nodes[id_str] not in parent_node["children"]:
                parent_node["children"].append(nodes[id_str])
    
    return root_node, discrepancies

def write_discrepancy_report(discrepancies, output_file):
    with open(output_file, 'w') as f:
        f.write("FAMILY TREE DISCREPANCY REPORT\n")
        f.write("============================\n\n")
        
        for i, d in enumerate(discrepancies, 1):
            f.write(f"Discrepancy #{i}:\n")
            f.write("-" * 50 + "\n")
            
            if d["type"] == "missing_child_numbers":
                f.write("MISSING CHILD NUMBERS:\n")
                f.write(f"Parent: {d['parent_name']} (ID: {d['parent_id']})\n")
                f.write(f"Source: {d['source_line']}\n")
                f.write(f"Missing numbers: {d['missing_numbers']}\n")
                
                # List existing children
                parent_node = nodes.get(d["parent_id"])
                if parent_node:
                    f.write("Existing children:\n")
                    for child in parent_node["children"]:
                        child_num = child["id"].split("-")[-1]
                        f.write(f"  - #{child_num}: {child['name']} (ID: {child['id']})\n")
                        f.write(f"    {d['source_line']}\n")
            
            f.write("\n")

def main():
    input_file = "Pokharel Family - combined database.txt"
    output_file = "name_list.json"
    discrepancy_file = "discrepancy.list"
    html_output = "index.html"
    
    root_node, discrepancies = parse_family_tree(input_file)
    
    # Write the JSON output
    with open(output_file, 'w') as f:
        json.dump([root_node], f, indent=2)
    print(f"Generated {os.path.abspath(output_file)}")
    
    # Generate and write HTML tree
    html_content = generate_html_tree(root_node)
    with open(html_output, 'w') as f:
        f.write(html_content)
    print(f"Generated {os.path.abspath(html_output)}")
    
    # Write discrepancy report
    write_discrepancy_report(discrepancies, discrepancy_file)
    print(f"Found {len(discrepancies)} discrepancies in {os.path.abspath(discrepancy_file)}")

if __name__ == "__main__":
    main() 