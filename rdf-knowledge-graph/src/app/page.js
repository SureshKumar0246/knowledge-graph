'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function Home() {
  // Application Data States
  const [triples, setTriples] = useState([]);
  const [rdfXml, setRdfXml] = useState('');
  const [schemas, setSchemas] = useState({ schema: '', ex: '', foaf: '' });
  const [selectedSchemaTab, setSelectedSchemaTab] = useState('schema');
  
  // Status and Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isPushing, setIsPushing] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResults, setQueryResults] = useState(null);
  
  // Connection and Config States
  const [neo4jConfig, setNeo4jConfig] = useState({
    uri: 'bolt://localhost:7687',
    username: 'neo4j',
    password: 'Neoneo.12', // Preset password as requested
    isMock: false // Direct connection active by default
  });

  // Query editor states - fully editable custom queries
  const [sparqlQuery, setSparqlQuery] = useState(`PREFIX ex: <http://example.org/ns#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?student ?university ?subject ?friend ?company
WHERE {
  ?s_uri rdf:type ex:Student ;
         ex:studentOf ?u_uri ;
         ex:studies ?sub_uri ;
         foaf:knows ?f_uri .
  ?f_uri ex:worksAt ?c_uri .
  
  BIND(STRAFTER(STR(?s_uri), "#") AS ?student)
  BIND(STRAFTER(STR(?u_uri), "#") AS ?university)
  BIND(STRAFTER(STR(?sub_uri), "#") AS ?subject)
  BIND(STRAFTER(STR(?f_uri), "#") AS ?friend)
  BIND(STRAFTER(STR(?c_uri), "#") AS ?company)
}`);

  const [cypherQuery, setCypherQuery] = useState(`MATCH (student:Student)-[:STUDENT_OF]->(university:University)
MATCH (student)-[:STUDIES]->(subject:Subject)
MATCH (student)-[:KNOWS]->(friend:Person)
MATCH (friend)-[:WORKS_AT]->(company:Company)
RETURN student.name AS student,
       university.name AS university,
       subject.name AS subject,
       friend.name AS friend,
       company.name AS company`);
  
  // Console logs
  const [logs, setLogs] = useState([]);

  // Interactive Graph Node States (Initialized with pre-calculated premium positions)
  const [nodes, setNodes] = useState([
    { id: 'Ali', label: 'Ali', type: 'Student', x: 260, y: 190, color: '#06b6d4', size: 28 },
    { id: 'DSU', label: 'DHA Suffa Univ.', type: 'University', x: 100, y: 80, color: '#3b82f6', size: 24 },
    { id: 'CS', label: 'Comp. Science', type: 'Subject', x: 100, y: 300, color: '#10b981', size: 24 },
    { id: 'Ahmed', label: 'Ahmed', type: 'Person', x: 440, y: 190, color: '#8b5cf6', size: 26 },
    { id: 'TechSoft', label: 'TechSoft', type: 'Company', x: 600, y: 190, color: '#ec4899', size: 24 }
  ]);

  const links = [
    { source: 'Ali', target: 'DSU', label: 'ex:studentOf' },
    { source: 'Ali', target: 'CS', label: 'ex:studies' },
    { source: 'Ali', target: 'Ahmed', label: 'foaf:knows' },
    { source: 'Ahmed', target: 'TechSoft', label: 'ex:worksAt' }
  ];

  // Dragging interaction states
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const svgRef = useRef(null);

  // Helper to add log entry
  const addLog = (text, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ text, type, time }, ...prev]);
  };

  // Fetch initial RDF & Triple data
  useEffect(() => {
    async function fetchData() {
      try {
        addLog('Connecting to semantic engine...', 'info');
        const res = await fetch('/api/rdf');
        const data = await res.json();
        
        if (data.success) {
          setTriples(data.triples);
          setRdfXml(data.rdfXml);
          setSchemas(data.schemas);
          addLog('RDF Graph generated and schemas fetched successfully.', 'success');
        } else {
          addLog(`Failed to fetch RDF: ${data.error}`, 'error');
        }
      } catch (err) {
        addLog(`Network error loading RDF data: ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Handle XML validation
  const handleValidate = async () => {
    setIsValidating(true);
    addLog('Validating RDF/XML against XSD schemas...', 'info');
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rdfXml })
      });
      const data = await res.json();
      
      if (data.success) {
        setValidationResult({ valid: data.valid, errors: data.errors });
        if (data.valid) {
          addLog('Validation success: XML is perfectly valid under XSD!', 'success');
        } else {
          addLog(`Validation failed: ${data.errors.length} errors found.`, 'error');
        }
      } else {
        addLog(`Validation failed to execute: ${data.error}`, 'error');
      }
    } catch (err) {
      addLog(`Network error during validation: ${err.message}`, 'error');
    } finally {
      setIsValidating(false);
    }
  };

  // Handle Neo4j Pushing
  const handlePushToNeo4j = async () => {
    setIsPushing(true);
    addLog(neo4jConfig.isMock 
      ? 'Pushing RDF triples to Graph database (Mock Mode)...' 
      : 'Connecting to Neo4j instance at ' + neo4jConfig.uri + '...', 'info');
      
    try {
      const res = await fetch('/api/neo4j/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(neo4jConfig)
      });
      const data = await res.json();
      
      if (data.success) {
        addLog(data.message, 'success');
        addLog(`Database updated: Created ${data.summary.nodesCreated} nodes and ${data.summary.relationshipsCreated} relationships.`, 'success');
      } else {
        addLog(`Push failed: ${data.error}`, 'error');
      }
    } catch (err) {
      addLog(`Network error pushing graph: ${err.message}`, 'error');
    } finally {
      setIsPushing(false);
    }
  };

  // Handle Query firing
  const handleFireQuery = async () => {
    setIsQuerying(true);
    addLog(neo4jConfig.isMock
      ? 'Firing SPARQL query on local RDF graph...'
      : 'Firing custom Cypher query on Neo4j Graph Database...', 'info');
      
    try {
      const res = await fetch('/api/neo4j/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...neo4jConfig,
          sparqlQuery,
          cypherQuery
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setQueryResults(data.results);
        addLog(`Query completed successfully (Source: ${data.source}). Retrieved ${data.results.length} rows.`, 'success');
      } else {
        addLog(`Query execution failed: ${data.error}`, 'error');
      }
    } catch (err) {
      addLog(`Network error during query: ${err.message}`, 'error');
    } finally {
      setIsQuerying(false);
    }
  };

  // Draggable Node logic for SVG graph
  const handleMouseDown = (nodeId) => (e) => {
    e.preventDefault();
    setDraggedNodeId(nodeId);
  };

  const handleMouseMove = (e) => {
    if (!draggedNodeId || !svgRef.current) return;
    
    // Get mouse coordinate relative to SVG container
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Bounds clamping
    const x = Math.max(30, Math.min(rect.width - 30, mouseX));
    const y = Math.max(30, Math.min(rect.height - 30, mouseY));

    setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x, y } : n));
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  // Terminate drag when mouse leaves container
  const handleMouseLeave = () => {
    setDraggedNodeId(null);
  };

  // Find coordinates of nodes for links
  const getNodePos = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  // Dynamically extract table headers from the first query result
  const getHeaders = () => {
    if (!queryResults || queryResults.length === 0) return [];
    return Object.keys(queryResults[0]);
  };

  return (
    <div className="dashboard-container" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      {/* Header */}
      <header className="header">
        <h1>DHA Suffa RDF Knowledge Graph</h1>
        <p>Convert Paragraph to Semantic Graph, Validate with XSD Schemas, and Integrate with Neo4j</p>
      </header>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Loading Semantic Engine...</div>
          <p>Analyzing context and loading schema validations...</p>
        </div>
      ) : (
        <>
          {/* Top Grid: Paragraph, Triples, and Visual Graph */}
          <div className="grid-layout">
            {/* Left Card: Input Text and Triples */}
            <div className="card col-6">
              <div className="card-title">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v3m-3.375-3h-1.5a1.125 1.125 0 0 0-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h1.5a1.125 1.125 0 0 0 1.125-1.125v-1.5a1.125 1.125 0 0 0-1.125-1.125Z"/>
                </svg>
                Original Text & Extracted Triples
              </div>
              <div className="paragraph-box">
                "<strong>Ali</strong> is a student of <strong>DHA Suffa University</strong>. He studies <strong>Computer Science</strong>. Ali knows <strong>Ahmed</strong>. Ahmed works at <strong>TechSoft</strong>."
              </div>
              
              <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Extracted RDF Triples (Subject, Predicate, Object)
              </div>
              <div className="triples-list">
                {triples.map((t, idx) => {
                  const sLabel = t.subject.split('#').pop() || t.subject.split('/').pop();
                  const pLabel = t.predicate.split('#').pop() || t.predicate.split('/').pop();
                  const oLabel = t.object.split('#').pop() || t.object.split('/').pop();
                  return (
                    <div className="triple-item" key={idx}>
                      <span className="triple-part triple-s" title={t.subject}>{sLabel}</span>
                      <span className="triple-part triple-p" title={t.predicate}>{pLabel}</span>
                      <span className="triple-part triple-o" title={t.object}>{oLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Card: Interactive SVG Knowledge Graph */}
            <div className="card col-6">
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/>
                  </svg>
                  Interactive Knowledge Graph Visualization
                </div>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Interactive Canvas</span>
              </div>
              
              <div className="graph-container" onMouseLeave={handleMouseLeave}>
                <svg className="graph-svg" ref={svgRef}>
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted)" />
                    </marker>
                  </defs>

                  {/* Render Links */}
                  {links.map((link, idx) => {
                    const posS = getNodePos(link.source);
                    const posT = getNodePos(link.target);
                    const midX = (posS.x + posT.x) / 2;
                    const midY = (posS.y + posT.y) / 2;
                    
                    return (
                      <g key={idx}>
                        <line 
                          className="link"
                          x1={posS.x} 
                          y1={posS.y} 
                          x2={posT.x} 
                          y2={posT.y} 
                          stroke="var(--border-color-hover)" 
                          strokeWidth="2"
                          markerEnd="url(#arrow)"
                        />
                        <rect x={midX - 35} y={midY - 8} width="70" height="15" rx="3" fill="#060913" stroke="var(--border-color)" strokeWidth="0.5" />
                        <text className="link-label" x={midX} y={midY + 3}>
                          {link.label.split(':').pop()}
                        </text>
                      </g>
                    );
                  })}

                  {/* Render Nodes */}
                  {nodes.map((node) => (
                    <g 
                      key={node.id} 
                      transform={`translate(${node.x},${node.y})`}
                      onMouseDown={handleMouseDown(node.id)}
                      className="node"
                    >
                      <circle 
                        r={node.size} 
                        fill={node.color} 
                        fillOpacity="0.15" 
                        stroke={node.color} 
                        strokeWidth="2.5" 
                        style={{ filter: 'drop-shadow(0px 0px 8px ' + node.color + '40)' }}
                      />
                      <circle r={4} fill={node.color} />
                      <text className="node-label" y={node.size + 15}>
                        {node.label}
                      </text>
                      <text y="-3" style={{ fontSize: '8px', fill: 'var(--text-secondary)', textAnchor: 'middle', fontWeight: 'bold' }}>
                        {node.type}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem' }}>
                💡 Tip: Click and drag the nodes to arrange the Knowledge Graph layout dynamically.
              </div>
            </div>
          </div>

          {/* Middle Section: Serialization and validation */}
          <div className="card col-12" style={{ marginBottom: '2rem' }}>
            <div className="card-title" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                </svg>
                RDF/XML Serialization & XSD validation Hub
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {validationResult && (
                  <span className={`badge ${validationResult.valid ? 'badge-green' : 'badge-red'}`}>
                    {validationResult.valid ? '✓ XML SCHEMA VALID' : '✗ SCHEMA VALIDATION FAILED'}
                  </span>
                )}
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={handleValidate}
                  disabled={isValidating}
                >
                  {isValidating ? 'Validating...' : 'Validate XML'}
                </button>
              </div>
            </div>

            <div className="code-panels">
              {/* Left Panel: XML Editor */}
              <div className="code-editor-container">
                <div className="code-editor-header">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Serialized RDF/XML (Editable)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Format: XML</span>
                </div>
                <textarea 
                  className="code-editor"
                  value={rdfXml}
                  onChange={(e) => setRdfXml(e.target.value)}
                  placeholder="Paste RDF/XML content here..."
                />
              </div>

              {/* Right Panel: XSD Viewers */}
              <div className="code-editor-container">
                <div className="code-editor-header">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>XML Schema Definitions (XSD)</span>
                  <div className="xsd-tabs">
                    <button 
                      className={`xsd-tab ${selectedSchemaTab === 'schema' ? 'active' : ''}`}
                      onClick={() => setSelectedSchemaTab('schema')}
                    >
                      schema.xsd (Master)
                    </button>
                    <button 
                      className={`xsd-tab ${selectedSchemaTab === 'ex' ? 'active' : ''}`}
                      onClick={() => setSelectedSchemaTab('ex')}
                    >
                      ex.xsd
                    </button>
                    <button 
                      className={`xsd-tab ${selectedSchemaTab === 'foaf' ? 'active' : ''}`}
                      onClick={() => setSelectedSchemaTab('foaf')}
                    >
                      foaf.xsd
                    </button>
                  </div>
                </div>
                <textarea 
                  className="code-editor"
                  style={{ color: '#c084fc' }}
                  readOnly
                  value={
                    selectedSchemaTab === 'schema' ? schemas.schema :
                    selectedSchemaTab === 'ex' ? schemas.ex : schemas.foaf
                  }
                />
              </div>
            </div>
            
            {/* Validation Diagnostic Log */}
            {validationResult && !validationResult.valid && (
              <div style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ color: 'var(--accent-red)', fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Schema Validation Diagnostics:</div>
                <ul style={{ listStyleType: 'none', paddingLeft: 0, fontSize: '0.825rem', fontFamily: 'var(--font-mono)', color: '#fda4af' }}>
                  {validationResult.errors.map((err, idx) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Bottom Grid: Neo4j and Querying */}
          <div className="grid-layout">
            {/* Left Card: Database Integration */}
            <div className="card col-5">
              <div className="card-title">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V18M3.75 10.125v3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V18"/>
                </svg>
                Neo4j Graph Database Integration
              </div>

              {/* Mock mode toggle */}
              <div className="neo-switch-container">
                <span className="switch-label">Use Built-in Database Mock</span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={neo4jConfig.isMock}
                    onChange={(e) => setNeo4jConfig(prev => ({ ...prev, isMock: e.target.checked }))}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {/* Connection fields */}
              {!neo4jConfig.isMock && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div className="form-group">
                    <label>Neo4j Connection URI</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={neo4jConfig.uri}
                      onChange={(e) => setNeo4jConfig(prev => ({ ...prev, uri: e.target.value }))}
                      placeholder="bolt://localhost:7687"
                    />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={neo4jConfig.username}
                      onChange={(e) => setNeo4jConfig(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      value={neo4jConfig.password}
                      onChange={(e) => setNeo4jConfig(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                ℹ️ RDF mapping details: Subject nodes mapping to property graph labels based on <code>rdf:type</code>. Edges mapping to Cypher relations.
              </div>

              <div className="btn-row">
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={handlePushToNeo4j}
                  disabled={isPushing}
                >
                  {isPushing ? 'Pushing Graph...' : 'Push Graph to Neo4j'}
                </button>
              </div>
            </div>

            {/* Right Card: SPARQL and query hub */}
            <div className="card col-7">
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z"/>
                  </svg>
                  Semantic SPARQL / Cypher Query Hub
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={handleFireQuery}
                  disabled={isQuerying}
                >
                  {isQuerying ? 'Executing...' : 'Fire Query'}
                </button>
              </div>

              {/* Editable Query Code Blocks */}
              <div className="query-comparison">
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '600' }}>SPARQL Query (Editable)</div>
                  <textarea 
                    className="query-code-block" 
                    style={{ width: '100%', resize: 'none', border: '1px solid var(--border-color)', outline: 'none' }}
                    value={sparqlQuery}
                    onChange={(e) => setSparqlQuery(e.target.value)}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '600' }}>Cypher Query (Editable)</div>
                  <textarea 
                    className="query-code-block" 
                    style={{ width: '100%', color: '#93c5fd', resize: 'none', border: '1px solid var(--border-color)', outline: 'none' }}
                    value={cypherQuery}
                    onChange={(e) => setCypherQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Dynamic Result display */}
              <div className="results-box">
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Query Results Table</div>
                {queryResults ? (
                  queryResults.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="results-table">
                        <thead>
                          <tr>
                            {getHeaders().map((header) => (
                              <th key={header}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResults.map((row, idx) => (
                            <tr key={idx} style={{ animation: 'fadeIn 0.3s ease' }}>
                              {getHeaders().map((header) => (
                                <td key={header} style={{ color: header === 'student' || header === 'friend' ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                                  {row[header]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="results-empty">Query returned 0 results. Check database nodes.</div>
                  )
                ) : (
                  <div className="results-empty">Click "Fire Query" to retrieve answers from the database.</div>
                )}
              </div>
            </div>
          </div>

          {/* Console logger */}
          <div className="card col-12">
            <div className="card-title">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"/>
              </svg>
              Transaction Log Console
            </div>
            <div className="console-logs">
              {logs.map((log, idx) => (
                <div className="log-entry" key={idx}>
                  <span className="log-time">[{log.time}]</span>
                  <span className={`log-${log.type}`}>
                    {log.type === 'success' ? '✔ ' : log.type === 'error' ? '✘ ' : 'ℹ '}
                    {log.text}
                  </span>
                </div>
              ))}
              {logs.length === 0 && <div style={{ color: 'var(--text-muted)' }}>Console idle... awaiting interactions.</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
