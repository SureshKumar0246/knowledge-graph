import rdflib
import xmlschema
from rdflib import Graph, URIRef, RDF

# 1. Generate RDF/XML
g = Graph()
EX = rdflib.Namespace("http://example.org/ns#")
FOAF = rdflib.Namespace("http://xmlns.com/foaf/0.1/")

g.bind("ex", EX)
g.bind("foaf", FOAF)

ali = URIRef("http://example.org/ns#Ali")
dsu = URIRef("http://example.org/ns#DHASuffaUniversity")
g.add((ali, RDF.type, EX.Student))
g.add((ali, EX.studentOf, dsu))

cs = URIRef("http://example.org/ns#ComputerScience")
g.add((ali, EX.studies, cs))

ahmed = URIRef("http://example.org/ns#Ahmed")
g.add((ali, FOAF.knows, ahmed))

techsoft = URIRef("http://example.org/ns#TechSoft")
g.add((ahmed, RDF.type, EX.Person))
g.add((ahmed, EX.worksAt, techsoft))

# Serialize to file
rdf_file = "knowledge_graph.rdf"
g.serialize(destination=rdf_file, format="xml")
print(f"Serialized RDF/XML to {rdf_file}")

# 2. Validate using xmlschema
try:
    schema = xmlschema.XMLSchema("schema.xsd")
    schema.validate(rdf_file)
    print("Validation SUCCESS: The RDF/XML is valid according to the XSD schemas!")
except Exception as e:
    print(f"Validation FAILED: {e}")
