import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

export async function POST(request) {
  try {
    const { uri, username, password, isMock } = await request.json();

    if (isMock) {
      // Simulate pushing to Neo4j
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return NextResponse.json({
        success: true,
        message: 'Successfully simulated pushing Knowledge Graph to Neo4j (Mock Mode).',
        summary: {
          nodesCreated: 5,
          relationshipsCreated: 4,
          labels: ['Student', 'Person', 'University', 'Subject', 'Company'],
          types: ['STUDENT_OF', 'STUDIES', 'KNOWS', 'WORKS_AT']
        }
      });
    }

    if (!uri || !username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Missing connection credentials for Neo4j (URI, Username, or Password).'
      }, { status: 400 });
    }

    // Connect to actual Neo4j
    const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    const session = driver.session();

    try {
      // 1. Clear database
      await session.run('MATCH (n) DETACH DELETE n');

      // 2. Create entities and relationships in a single transaction
      const cypherQuery = `
        CREATE (ali:Student:Person {name: "Ali", uri: "http://example.org/ns#Ali"})
        CREATE (dsu:University {name: "DHA Suffa University", uri: "http://example.org/ns#DHASuffaUniversity"})
        CREATE (cs:Subject {name: "Computer Science", uri: "http://example.org/ns#ComputerScience"})
        CREATE (ahmed:Person {name: "Ahmed", uri: "http://example.org/ns#Ahmed"})
        CREATE (techsoft:Company {name: "TechSoft", uri: "http://example.org/ns#TechSoft"})
        
        CREATE (ali)-[:STUDENT_OF]->(dsu)
        CREATE (ali)-[:STUDIES]->(cs)
        CREATE (ali)-[:KNOWS]->(ahmed)
        CREATE (ahmed)-[:WORKS_AT]->(techsoft)
      `;

      await session.run(cypherQuery);

      return NextResponse.json({
        success: true,
        message: 'Successfully connected and populated Neo4j database.',
        summary: {
          nodesCreated: 5,
          relationshipsCreated: 4,
          labels: ['Student', 'Person', 'University', 'Subject', 'Company'],
          types: ['STUDENT_OF', 'STUDIES', 'KNOWS', 'WORKS_AT']
        }
      });

    } finally {
      await session.close();
      await driver.close();
    }

  } catch (err) {
    return NextResponse.json({
      success: false,
      error: `Neo4j Connection Error: ${err.message}`
    }, { status: 500 });
  }
}
