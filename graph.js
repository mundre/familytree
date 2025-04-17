// Load the family data
console.log('Starting to load family data...');
fetch('family_data.json')
  .then(response => {
    console.log('Response received:', response);
    return response.json();
  })
  .then(data => {
    console.log('Data loaded:', data);
    const familyData = data.family;
    
    // Convert the flat structure to a hierarchical structure
    const root = buildHierarchy(familyData);
    console.log('Hierarchy built:', root);
    
    // Set up the SVG dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;
    console.log('SVG dimensions:', width, height);
    
    const svg = d3.select("#graph")
      .attr("width", width)
      .attr("height", height);
    
    // Create the tree layout with top-to-bottom orientation and top margin
    const treeLayout = d3.tree()
      .size([width - 200, height - 300]); // Added more top margin
    
    // Create the hierarchy and compute the tree layout
    const hierarchy = d3.hierarchy(root);
    
    // Collapse all nodes except root initially
    hierarchy.descendants().forEach(d => {
      if (d.depth > 0) {
        d._children = d.children;
        d.children = null;
      }
    });
    
    // Function to update the tree
    function update(source) {
      const treeData = treeLayout(hierarchy);
      
      // Compute the new tree layout
      const nodes = treeData.descendants();
      const links = treeData.links();
      
      // Update the links with faster transitions
      const link = svg.selectAll(".link")
        .data(links, d => d.target.id);
      
      // Enter any new links
      const linkEnter = link.enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d3.linkVertical()
          .x(d => d.x)
          .y(d => d.y + 50));
      
      // Update existing links with shorter duration
      link.transition()
        .duration(200) // Reduced from 500 to 200
        .attr("d", d3.linkVertical()
          .x(d => d.x)
          .y(d => d.y + 50));
      
      // Exit any old links
      link.exit().remove();
      
      // Update the nodes with faster transitions
      const node = svg.selectAll(".node")
        .data(nodes, d => d.id || (d.id = ++i));
      
      // Enter any new nodes
      const nodeEnter = node.enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x},${d.y + 50})`);
      
      // Add circles for nodes
      nodeEnter.append("circle")
        .attr("r", 15)
        .attr("class", d => d.data.spouse ? "married" : "single")
        .on("click", click);
      
      // Add expand/collapse indicators inside the circle
      nodeEnter.append("text")
        .attr("class", "expand-collapse")
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .style("cursor", "pointer")
        .style("font-size", "16px")
        .style("fill", "white")
        .text(d => {
          if (d.children) return "-";
          if (d._children) return "+";
          return "";
        });
      
      // Add text labels
      nodeEnter.append("text")
        .attr("class", "node-label")
        .attr("dy", ".35em")
        .attr("x", d => (d.children || d._children) ? -18 : 18)
        .style("text-anchor", d => (d.children || d._children) ? "end" : "start")
        .text(d => d.data.name);
      
      // Update existing nodes with shorter duration
      node.transition()
        .duration(200) // Reduced from 500 to 200
        .attr("transform", d => `translate(${d.x},${d.y + 50})`);
      
      // Update expand/collapse indicators immediately
      node.select(".expand-collapse")
        .text(d => {
          if (d.children) return "-";
          if (d._children) return "+";
          return "";
        });
      
      // Exit any old nodes
      node.exit().remove();
    }
    
    // Toggle children on click with immediate visual feedback
    function click(event, d) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else if (d._children) {
        d.children = d._children;
        d._children = null;
      } else {
        return;
      }
      
      // Update the tree immediately
      update(d);
      
      // Prevent event propagation
      event.stopPropagation();
    }
    
    // Initialize the tree
    let i = 0;
    update(hierarchy);
  })
  .catch(error => {
    console.error('Error loading family data:', error);
    console.error('Error stack:', error.stack);
  });

// Function to convert flat structure to hierarchy
function buildHierarchy(familyData) {
  const members = familyData.members;
  const memberMap = new Map();
  
  // First pass: create all nodes
  members.forEach(member => {
    memberMap.set(member.id, {
      name: member.name,
      spouse: member.spouse,
      children: []
    });
  });
  
  // Second pass: build the hierarchy
  members.forEach(member => {
    const node = memberMap.get(member.id);
    if (member.children && member.children.length > 0) {
      member.children.forEach(childId => {
        const child = memberMap.get(childId);
        if (child) {
          node.children.push(child);
        }
      });
    }
  });
  
  // Find the top-level node (Family Tree)
  const topNode = members.find(member => 
    !members.some(m => m.children && m.children.includes(member.id))
  );
  
  // Return the hierarchy starting from the top node
  return memberMap.get(topNode.id);
}
