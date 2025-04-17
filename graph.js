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
    
    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
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
      }
      .name-label {
        fill: black;
      }
    `;
    document.head.appendChild(style);
    
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