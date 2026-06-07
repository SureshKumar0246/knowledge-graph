import rdflib

g = rdflib.Graph()
g.parse("knowledge_graph.rdf", format="xml")

query = """
PREFIX ex: <http://example.org/ns#>
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
}
"""

print("Executing SPARQL query...")
results = g.query(query)

for row in results:
    print(f"Student: {row.student}")
    print(f"University: {row.university}")
    print(f"Subject: {row.subject}")
    print(f"Friend: {row.friend}")
    print(f"Company: {row.company}")
