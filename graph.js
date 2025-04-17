// Load the family data
console.log('Starting to load family data...');
fetch('name_list.json')
  .then(response => {
    console.log('Response received:', response);
    return response.json();
  })
  .then(data => {
    console.log('Data loaded:', data);
    const root = data[0]; // name_list.json has an array with a single root element
    
    // Set up the SVG dimensions with more space
    const width = Math.max(window.innerWidth, 1500); // Increased minimum width
    const height = Math.max(window.innerHeight, 1000); // Increased minimum height
    console.log('SVG dimensions:', width, height);
    
    // Create SVG container
    const svg = d3.select("#tree")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
    
    // Create a group for the tree that will be transformed
    const g = svg.append("g")
      .attr("transform", `translate(${width/4},${height/2})`);
    
    // Add help text
    const helpText = svg.append("text")
      .attr("class", "help-text")
      .attr("x", width/4)
      .attr("y", height/2 - 50)
      .style("text-anchor", "middle")
      .style("font-size", "18px")
      .style("fill", "#666")
      .text("Click on the circle to expand the tree");

    // Add arrow pointing to root node
    const arrow = svg.append("path")
      .attr("class", "help-arrow")
      .attr("d", `M ${width/4},${height/2 - 40} L ${width/4},${height/2 - 20}`)
      .style("stroke", "#666")
      .style("stroke-width", "2")
      .style("fill", "none")
      .style("marker-end", "url(#arrowhead)");

    // Add arrowhead marker definition
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 5)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .style("fill", "#666");

    // Function to hide help elements
    function hideHelp() {
      helpText.style("opacity", 0).style("pointer-events", "none");
      arrow.style("opacity", 0).style("pointer-events", "none");
    }
    
    // Add zoom behavior to the SVG, transforming the group
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Create the tree layout with increased spacing
    const treeLayout = d3.tree()
      .nodeSize([100, 220]); // Increased spacing to accommodate larger nodes
    
    // Create the hierarchy and compute the tree layout
    const hierarchy = d3.hierarchy(root);
    
    // Initialize the root node's children
    if (hierarchy.children) {
      hierarchy._children = hierarchy.children;
      hierarchy.children = null;
    }

    // Function to toggle children
    function toggleChildren(d) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else if (d._children) {
        d.children = d._children;
        d._children = null;
        // Collapse any expanded children
        d.children.forEach(child => {
          if (child.children) {
            child._children = child.children;
            child.children = null;
          }
        });
      }
      return d;
    }

    // Function to find a node by name
    function findNode(node, name) {
      if (node.data.name.toLowerCase().includes(name.toLowerCase())) {
        return node;
      }
      if (node.children) {
        for (let child of node.children) {
          const found = findNode(child, name);
          if (found) return found;
        }
      }
      if (node._children) {
        for (let child of node._children) {
          const found = findNode(child, name);
          if (found) return found;
        }
      }
      return null;
    }

    // Function to expand path to a node
    function expandPathTo(node) {
      if (!node) return;
      
      let current = node;
      const pathToRoot = [];
      
      // Collect path from node to root
      while (current.parent) {
        pathToRoot.push(current.parent);
        current = current.parent;
      }
      
      // First collapse all nodes
      hierarchy.descendants().forEach(d => {
        if (d.children) {
          d._children = d.children;
          d.children = null;
        }
      });
      
      // Then expand only the path to our target node
      pathToRoot.reverse().forEach(n => {
        if (n._children) {
          n.children = n._children;
          n._children = null;
        }
      });

      // If the target node has children, show them
      if (node._children) {
        node.children = node._children;
        node._children = null;
        // Ensure children start collapsed
        if (node.children) {
          node.children.forEach(child => {
            if (child.children) {
              child._children = child.children;
              child.children = null;
            }
          });
        }
      }
    }

    // Function to remove highlight from all nodes
    function clearHighlight() {
      g.selectAll(".node").classed("found-node", false);
    }
    
    // Function to center node
    function centerNode(source) {
      const scale = d3.zoomTransform(svg.node()).k;
      const x = -source.y * scale;
      const y = -source.x * scale;
      
      svg.transition()
        .duration(750)
        .call(zoom.transform, 
          d3.zoomIdentity
            .translate(width/3, height/2)
            .translate(x, y)
            .scale(scale)
        );
    }
    
    // Function to update the tree
    function update(source) {
      const treeData = treeLayout(hierarchy);
      
      // Compute the new tree layout
      const nodes = treeData.descendants();
      const links = treeData.links();
      
      // Normalize for fixed-depth
      nodes.forEach(d => {
        d.y = d.depth * 220; // Horizontal spacing
      });
      
      // Update the links
      const link = g.selectAll(".link")
        .data(links, d => d.target.data.id);
      
      // Enter any new links
      const linkEnter = link.enter().append("path")
        .attr("class", "link")
        .attr("d", d3.linkHorizontal()
          .x(d => source.y0)
          .y(d => source.x0));
      
      // Update existing links
      link.merge(linkEnter)
        .transition()
        .duration(750)
        .attr("d", d3.linkHorizontal()
          .x(d => d.y)
          .y(d => d.x));
      
      // Remove any exiting links
      link.exit()
        .transition()
        .duration(750)
        .attr("d", d3.linkHorizontal()
          .x(d => source.y)
          .y(d => source.x))
        .remove();
      
      // Update the nodes
      const node = g.selectAll(".node")
        .data(nodes, d => d.data.id);
      
      // Enter any new nodes
      const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.y0},${source.x0})`);
      
      // Add circles for the nodes
      nodeEnter.append("circle")
        .attr("r", d => d === hierarchy ? 50 : 15)
        .attr("class", d => d.data.spouse ? "married" : "single");
      
      // Add + symbol for nodes with hidden children
      nodeEnter.append("text")
        .attr("class", "expand-symbol")
        .attr("dy", d => d === hierarchy ? ".45em" : ".35em")
        .style("text-anchor", "middle")
        .style("font-size", d => d === hierarchy ? "36px" : "20px")
        .style("fill", "#666")
        .text(d => d._children ? "+" : "");
      
      // Add name label below the node
      nodeEnter.append("text")
        .attr("class", "name-label")
        .attr("dy", d => d === hierarchy ? "3.5em" : "2.5em")
        .style("text-anchor", "middle")
        .text(d => d.data.name);
      
      // UPDATE
      const nodeUpdate = node.merge(nodeEnter);
      
      // Transition to the proper position for the nodes
      nodeUpdate.transition()
        .duration(750)
        .attr("transform", d => `translate(${d.y},${d.x})`);
      
      // Update the node attributes
      nodeUpdate.select("circle")
        .attr("r", d => d === hierarchy ? 50 : 15)
        .attr("class", d => d.data.spouse ? "married" : "single");
      
      nodeUpdate.select(".expand-symbol")
        .text(d => d._children ? "+" : "")
        .attr("dy", d => d === hierarchy ? ".45em" : ".35em")
        .style("font-size", d => d === hierarchy ? "36px" : "20px");
      
      // Remove any exiting nodes
      const nodeExit = node.exit()
        .transition()
        .duration(750)
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .remove();
      
      // Store the old positions for transition
      nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
      
      // Add click handlers
      nodeEnter.on("click", function(event, d) {
        event.stopPropagation();
        hideHelp();
        d = toggleChildren(d);
        update(d);
        centerNode(d);
      });
      
      nodeUpdate.on("click", function(event, d) {
        event.stopPropagation();
        hideHelp();
        d = toggleChildren(d);
        update(d);
        centerNode(d);
      });
    }
    
    // Initialize display
    hierarchy.x0 = height / 2;
    hierarchy.y0 = 0;
    update(hierarchy);

    // Initialize search state
    let foundResults = [];
    let currentResultIndex = -1;

    // Function to find all matching nodes
    function findNodes(node, name) {
      const results = [];
      
      function search(n) {
        if (n.data.name.toLowerCase().includes(name.toLowerCase())) {
          results.push(n);
        }
        if (n.children) {
          n.children.forEach(search);
        }
        if (n._children) {
          n._children.forEach(search);
        }
      }
      
      search(node);
      return results;
    }

    // Function to navigate to a specific search result
    function navigateToResult(index) {
      if (index < 0 || index >= foundResults.length) return;
      
      // Clear previous highlight
      clearHighlight();
      
      const foundNode = foundResults[index];
      currentResultIndex = index;
      
      // Update navigation buttons
      document.getElementById('prev-result').disabled = index === 0;
      document.getElementById('next-result').disabled = index === foundResults.length - 1;
      
      // Update result count
      document.getElementById('result-count').textContent = 
        `Result ${index + 1} of ${foundResults.length}`;
      
      // Show navigation if there are multiple results
      const navDiv = document.getElementById('search-navigation');
      navDiv.style.display = foundResults.length > 1 ? 'flex' : 'none';
      
      // Expand path and highlight node
      expandPathTo(foundNode);
      update(hierarchy);
      
      // Highlight the found node
      g.selectAll(".node")
        .filter(d => d === foundNode)
        .classed("found-node", true);
      
      // Center on the found node
      centerNode(foundNode);
    }

    // Add search functionality
    const searchInput = document.getElementById('search-input');
    const resultsDisplay = document.getElementById('search-results');
    
    searchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.trim();
      
      // Clear previous results
      clearHighlight();
      foundResults = [];
      currentResultIndex = -1;
      
      // Hide navigation and results
      document.getElementById('search-navigation').style.display = 'none';
      resultsDisplay.style.display = 'none';
      
      if (searchTerm.length < 2) {
        // If search is cleared, ensure tree is in initial state
        hierarchy.descendants().forEach(d => {
          if (d.children) {
            d._children = d.children;
            d.children = null;
          }
        });
        update(hierarchy);
        return;
      }
      
      // Find all matching nodes
      foundResults = findNodes(hierarchy, searchTerm);
      
      if (foundResults.length > 0) {
        // Show result count
        resultsDisplay.style.display = 'block';
        resultsDisplay.textContent = 
          `Found ${foundResults.length} match${foundResults.length > 1 ? 'es' : ''}`;
        
        // Navigate to first result
        navigateToResult(0);
      } else {
        // Show no results found
        resultsDisplay.style.display = 'block';
        resultsDisplay.textContent = 'No matches found';
      }
    });

    // Add navigation button handlers
    document.getElementById('prev-result').addEventListener('click', () => {
      if (currentResultIndex > 0) {
        navigateToResult(currentResultIndex - 1);
      }
    });

    document.getElementById('next-result').addEventListener('click', () => {
      if (currentResultIndex < foundResults.length - 1) {
        navigateToResult(currentResultIndex + 1);
      }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      const newWidth = Math.max(window.innerWidth, 1500);
      const newHeight = Math.max(window.innerHeight, 1000);
      svg.attr("width", newWidth).attr("height", newHeight);
      update(hierarchy);
    });
  })
  .catch(error => {
    console.error('Error loading family data:', error);
  });