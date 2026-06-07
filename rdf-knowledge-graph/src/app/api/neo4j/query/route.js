import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import neo4j from 'neo4j-driver';

export async function POST(request) {
  let tempQueryFilePath = null;
  try {
    const { uri, username, password, isMock, sparqlQuery, cypherQuery } = await request.json();

    const scriptsDir = path.join(process.cwd(), 'python_scripts');
    const queryScriptPath = path.join(scriptsDir, 'query_rdf.py');

    // 1. Run local SPARQL query using python as the primary RDF engine
    let sparqlResults = null;
    let sparqlErrors = [];
    
    try {
      // If a custom SPARQL query is provided, write it to a temp file to avoid Windows shell escaping bugs
      let pythonCmd = `python "${queryScriptPath}"`;
      if (sparqlQuery) {
        tempQueryFilePath = path.join(scriptsDir, 'temp_query.sparql');
        fs.writeFileSync(tempQueryFilePath, sparqlQuery, 'utf8');
        pythonCmd = `python "${queryScriptPath}" "${tempQueryFilePath.replace(/\\/g, '/')}"`;
      }

      // Execute the python SPARQL query script
      const pythonPromise = new Promise((resolve, reject) => {
        exec(pythonCmd, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout.trim());
          }
        });
      });
      
      const stdout = await pythonPromise;
      const parsed = JSON.parse(stdout);
      if (parsed.success) {
        sparqlResults = parsed.results;
      } else {
        sparqlErrors = parsed.errors;
      }
    } catch (err) {
      console.error('Local SPARQL execution failed, applying fallback data:', err.message);
      sparqlErrors.push(err.message);
      // Fallback local results matching the graph
      sparqlResults = [
        {
          student: "Ali",
          university: "DHASuffaUniversity",
          subject: "ComputerScience",
          friend: "Ahmed",
          company: "TechSoft"
        }
      ];
    } finally {
      // Clean up temp SPARQL query file if it was created
      if (tempQueryFilePath && fs.existsSync(tempQueryFilePath)) {
        try {
          fs.unlinkSync(tempQueryFilePath);
        } catch (cleanupErr) {
          console.error('Failed to delete temp query file:', cleanupErr.message);
        }
      }
    }

    // 2. If running in mock mode, return the SPARQL results as Neo4j results
    if (isMock) {
      await new Promise((resolve) => setTimeout(resolve, 800)); // simulation delay
      
      // If a custom Cypher query was typed in Mock Mode, return a helpful notice or parse it
      let mockResults = sparqlResults;
      if (cypherQuery && !cypherQuery.includes('student:Student')) {
        // If they did a custom query, let's return some mock nodes matching the general query
        mockResults = [
          {
            "Notice": "Running in Mock Mode. Connect to a real Neo4j database to run arbitrary Cypher queries.",
            "Query": cypherQuery.trim().substring(0, 100) + (cypherQuery.length > 100 ? '...' : '')
          }
        ];
      }

      return NextResponse.json({
        success: true,
        source: 'RDF Local Graph Engine (Mock Neo4j)',
        queryUsed: sparqlQuery || 'Default SPARQL',
        cypherQueryUsed: cypherQuery || 'Default Cypher',
        results: mockResults,
        errors: sparqlErrors
      });
    }

    // 3. If running in real mode, connect to Neo4j and execute Cypher
    if (!uri || !username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Missing connection credentials for Neo4j.'
      }, { status: 400 });
    }

    const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    const session = driver.session();
    
    // Default Cypher query if none provided
    const defaultCypherQuery = `
      MATCH (student:Student)-[:STUDENT_OF]->(university:University)
      MATCH (student)-[:STUDIES]->(subject:Subject)
      MATCH (student)-[:KNOWS]->(friend:Person)
      MATCH (friend)-[:WORKS_AT]->(company:Company)
      RETURN student.name AS student,
             university.name AS university,
             subject.name AS subject,
             friend.name AS friend,
             company.name AS company
    `;

    const activeCypherQuery = cypherQuery && cypherQuery.trim() !== '' ? cypherQuery : defaultCypherQuery;

    try {
      const result = await session.run(activeCypherQuery);
      
      // Map records dynamically to support ANY Cypher query returning ANY variables/fields
      const neo4jResults = result.records.map(record => {
        const row = {};
        record.keys.forEach(key => {
          const value = record.get(key);
          if (value === null || value === undefined) {
            row[key] = '';
          } else if (typeof value === 'object') {
            if (value.properties) {
              // It's a Node or Relationship. Return properties or string representation.
              row[key] = value.properties.name || JSON.stringify(value.properties);
            } else if (value.low !== undefined) {
              // It's an integer
              row[key] = String(value.low);
            } else {
              row[key] = JSON.stringify(value);
            }
          } else {
            row[key] = String(value);
          }
        });
        return row;
      });

      return NextResponse.json({
        success: true,
        source: 'Neo4j Graph Database (Real Connection)',
        queryUsed: sparqlQuery || 'Default SPARQL',
        cypherQueryUsed: activeCypherQuery,
        results: neo4jResults,
        errors: []
      });

    } finally {
      await session.close();
      await driver.close();
    }

  } catch (err) {
    return NextResponse.json({
      success: false,
      error: `Query execution error: ${err.message}`
    }, { status: 500 });
  }
}
