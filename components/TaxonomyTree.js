import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

const TaxonomyNode = ({ 
  node, 
  searchTerm = '', 
  expandedNodes, 
  setExpandedNodes,
  matchedNodes 
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const nodeId = node.id;
  const isExpanded = expandedNodes.includes(nodeId);
  
  const nameMatch = node.name.match(/^(.+?)\s*\((\d+)\)/);
  const rankMatch = node.name.match(/\[([^\]:]+?)\]/);
  const groupNameMatch = node.name.match(/\[Group name: ([^\]]+)\]/);

  const displayName = nameMatch ? nameMatch[1].trim() : '';
  const id = nameMatch ? nameMatch[2] : '';
  const rank = rankMatch ? rankMatch[1] : '';
  const groupName = groupNameMatch ? groupNameMatch[1] : null;

  const toggleExpand = (e) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
      if (prev.includes(nodeId)) {
        return prev.filter(id => id !== nodeId);
      } else {
        return [...prev, nodeId];
      }
    });
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-0.5 hover:bg-gray-50 ${
          matchedNodes.has(nodeId) ? 'bg-blue-50' : ''
        }`}
        style={{ paddingLeft: `${node.xCoord}px` }}
      >
        <span 
          className="inline-block w-4 text-gray-400 cursor-pointer mr-1"
          onClick={toggleExpand}
        >
          {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
        </span>

        <span className="text-sm whitespace-nowrap">
          {displayName} ({id})
          {rank && <span className="text-gray-500"> [{rank}]</span>}
          {groupName && (
            <span className="bg-yellow-50 px-1 rounded"> [Group name: {groupName}]</span>
          )}
        </span>
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TaxonomyNode 
              key={child.id} 
              node={child} 
              searchTerm={searchTerm}
              expandedNodes={expandedNodes}
              setExpandedNodes={setExpandedNodes}
              matchedNodes={matchedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TaxonomyTree = () => {
  const [taxonomyData, setTaxonomyData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState([]);
  const [matchedNodes, setMatchedNodes] = useState(new Set());

  useEffect(() => {
    const parseTree = async () => {
      try {
        const fileContent = await window.fs.readFile('paste.txt', { encoding: 'utf8' });
        const lines = fileContent.split('\n')
          .filter(line => line.trim())
          .filter(line => !line.startsWith('─'))
          .filter(line => !line.startsWith('Taxonomic'));

        const getDepth = (line) => {
          const match = line.match(/^[\s│]*/);
          return match ? Math.floor(match[0].length / 4) : 0;
        };

        const parseLine = (line) => {
          const depth = getDepth(line);
          const content = line.replace(/^[\s│├└──]*/, '').trim();
          
          const xCoordMatch = content.match(/\{x:\s*(\d+)px\}/);
          const xCoord = xCoordMatch ? parseInt(xCoordMatch[1]) : 20;
          
          const nameContent = content.replace(/\{x:\s*\d+px\}/g, '').trim();
          
          const match = nameContent.match(/^(.+?)\s*\((\d+)\)/);
          if (!match) return null;

          const nameWithId = match[0];
          const rest = nameContent.slice(nameWithId.length);
          const fullName = nameWithId + rest;

          return {
            name: fullName,
            id: match[2],
            depth,
            xCoord,
            children: []
          };
        };

        const root = parseLine(lines[0]);
        const stack = [{ node: root, depth: 0 }];

        for (let i = 1; i < lines.length; i++) {
          const node = parseLine(lines[i]);
          if (!node) continue;

          while (stack.length > 0 && stack[stack.length - 1].depth >= node.depth) {
            stack.pop();
          }

          if (stack.length > 0) {
            stack[stack.length - 1].node.children.push(node);
          }

          stack.push({ node, depth: node.depth });
        }

        setTaxonomyData(root);
        setExpandedNodes([root.id]);
      } catch (error) {
        console.error('Error loading taxonomy:', error);
      }
    };

    parseTree();
  }, []);

  useEffect(() => {
    if (!taxonomyData || !searchTerm) {
      setMatchedNodes(new Set());
      if (taxonomyData && !searchTerm) {
        setExpandedNodes([taxonomyData.id]);
      }
      return;
    }

    const matches = new Set();
    const expandNodes = new Set();
    const searchLower = searchTerm.toLowerCase();

    const findMatches = (node, parentPath = []) => {
      const currentPath = [...parentPath, node.id];
      const nodeName = node.name.toLowerCase();
      
      if (nodeName.includes(searchLower)) {
        matches.add(node.id);
        currentPath.forEach(id => expandNodes.add(id));
      }
      
      if (node.children) {
        node.children.forEach(child => {
          findMatches(child, currentPath);
        });
      }
    };

    findMatches(taxonomyData);
    
    setMatchedNodes(matches);
    if (matches.size > 0) {
      setExpandedNodes(Array.from(expandNodes));
    }
  }, [searchTerm, taxonomyData]);

  if (!taxonomyData) {
    return <div className="p-4">Loading taxonomy data...</div>;
  }

  return (
    <div className="font-sans p-4">
      <h2 className="text-xl font-semibold mb-4">NCBI Taxonomy Tree</h2>
      <div className="relative w-64 mb-4">
        <input
          type="text"
          placeholder="Search taxonomy..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 pl-8 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <Search className="w-4 h-4 absolute left-2.5 top-3 text-gray-400" />
      </div>
      <div className="border rounded-lg p-4 bg-white overflow-x-auto">
        <div className="min-w-[1200px]">
          <TaxonomyNode 
            node={taxonomyData} 
            searchTerm={searchTerm}
            expandedNodes={expandedNodes}
            setExpandedNodes={setExpandedNodes}
            matchedNodes={matchedNodes}
          />
        </div>
      </div>
    </div>
  );
};

export default TaxonomyTree;
