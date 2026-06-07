import rdflib
from rdflib import Graph, URIRef, RDF

# Create a graph
g = Graph()

# Define namespaces
EX = rdflib.Namespace("http://example.org/ns#")
FOAF = rdflib.Namespace("http://xmlns.com/foaf/0.1/")

g.bind("ex", EX)
g.bind("foaf", FOAF)

# Add triples
# Ali is a student of DHA Suffa University
ali = URIRef("http://example.org/ns#Ali")
dsu = URIRef("http://example.org/ns#DHASuffaUniversity")
g.add((ali, RDF.type, EX.Student))
g.add((ali, EX.studentOf, dsu))

# He studies Computer Science
cs = URIRef("http://example.org/ns#ComputerScience")
g.add((ali, EX.studies, cs))

# Ali knows Ahmed
ahmed = URIRef("http://example.org/ns#Ahmed")
g.add((ali, FOAF.knows, ahmed))

# Ahmed works at TechSoft
techsoft = URIRef("http://example.org/ns#TechSoft")
g.add((ahmed, RDF.type, EX.Person))
g.add((ahmed, EX.worksAt, techsoft))

# Serialize
rdf_xml = g.serialize(format="xml")
print(rdf_xml)
