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
    
    // Add zoom behavior to the SVG, transforming the group
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Create the tree layout with increased spacing
    const treeLayout = d3.tree()
      .nodeSize([80, 200]); // Adjust node spacing
    
    // Create the hierarchy and compute the tree layout
    const hierarchy = d3.hierarchy(root);
    
    // Collapse all nodes initially
    hierarchy.descendants().forEach(d => {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      }
    });

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
      
      // Update the links
      const link = g.selectAll(".link")
        .data(links, d => d.target.data.id);
      
      // Enter any new links
      const linkEnter = link.enter().append("path")
        .attr("class", "link")
        .attr("d", d3.linkHorizontal()
          .x(d => d.y)
          .y(d => d.x));
      
      // Update existing links
      link.merge(linkEnter)
        .transition()
        .duration(750)
        .attr("d", d3.linkHorizontal()
          .x(d => d.y)
          .y(d => d.x));
      
      // Remove any exiting links
      link.exit().remove();
      
      // Update the nodes
      const node = g.selectAll(".node")
        .data(nodes, d => d.data.id);
      
      // Enter any new nodes
      const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.y0},${source.x0})`);
      
      // Add circles for the nodes
      nodeEnter.append("circle")
        .attr("r", 10)
        .attr("class", d => d.data.spouse ? "married" : "single");
      
      // Add + symbol for nodes with hidden children
      nodeEnter.append("text")
        .attr("class", "expand-symbol")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#666")
        .text(d => d._children ? "+" : "");
      
      // Add name label below the node
      nodeEnter.append("text")
        .attr("class", "name-label")
        .attr("dy", "2em")
        .style("text-anchor", "middle")
        .text(d => d.data.name);
      
      // Transition nodes to their new positions
      const nodeUpdate = node.merge(nodeEnter)
        .transition()
        .duration(750)
        .attr("transform", d => `translate(${d.y},${d.x})`);
      
      // Update node attributes
      nodeUpdate.select("circle")
        .attr("r", 10)
        .attr("class", d => d.data.spouse ? "married" : "single");
      
      // Update + symbol
      nodeUpdate.select(".expand-symbol")
        .text(d => d._children ? "+" : "");

      nodeUpdate.select(".name-label")
        .text(d => d.data.name);
      
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
      
      // Add click handler for expanding/collapsing and centering
      nodeEnter.on("click", function(event, d) {
        event.stopPropagation();
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else if (d._children) {
          d.children = d._children;
          d._children = null;
        }
        update(d);
        centerNode(d);
      });
      
      node.on("click", function(event, d) {
        event.stopPropagation();
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else if (d._children) {
          d.children = d._children;
          d._children = null;
        }
        update(d);
        centerNode(d);
      });
    }
    
    // Initialize the tree
    hierarchy.x0 = 0;
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
      
      // Hide navigation
      document.getElementById('search-navigation').style.display = 'none';
      resultsDisplay.style.display = 'none';
      
      if (searchTerm.length < 2) return; // Only search for 2 or more characters
      
      // Find all matching nodes
      foundResults = findNodes(hierarchy, searchTerm);
      
      if (foundResults.length > 0) {
        // Show result count
        resultsDisplay.style.display = 'block';
        resultsDisplay.textContent = 
          `Found ${foundResults.length} match${foundResults.length > 1 ? 'es' : ''}`;
        
        // Navigate to first result
        navigateToResult(0);
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