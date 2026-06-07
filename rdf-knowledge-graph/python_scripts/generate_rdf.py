import os
import rdflib
from rdflib import Graph, URIRef, RDF

def main():
    # Setup directory paths
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Construct the RDF Graph
    g = Graph()
    
    # Define namespaces
    EX = rdflib.Namespace("http://example.org/ns#")
    FOAF = rdflib.Namespace("http://xmlns.com/foaf/0.1/")
    
    g.bind("ex", EX)
    g.bind("foaf", FOAF)
    
    # Add triples based on the paragraph:
    # "Ali is a student of DHA Suffa University. He studies Computer Science. Ali knows Ahmed. Ahmed works at TechSoft."
    ali = URIRef("http://example.org/ns#Ali")
    dsu = URIRef("http://example.org/ns#DHASuffaUniversity")
    cs = URIRef("http://example.org/ns#ComputerScience")
    ahmed = URIRef("http://example.org/ns#Ahmed")
    techsoft = URIRef("http://example.org/ns#TechSoft")
    
    # Ali is a student of DHA Suffa University
    g.add((ali, RDF.type, EX.Student))
    g.add((ali, EX.studentOf, dsu))
    
    # He studies Computer Science
    g.add((ali, EX.studies, cs))
    
    # Ali knows Ahmed
    g.add((ali, FOAF.knows, ahmed))
    
    # Ahmed works at TechSoft
    g.add((ahmed, RDF.type, EX.Person))
    g.add((ahmed, EX.worksAt, techsoft))
    
    # Serialize the RDF Graph to RDF/XML format
    rdf_file_path = os.path.join(current_dir, "knowledge_graph.rdf")
    g.serialize(destination=rdf_file_path, format="xml")
    print(f"RDF graph successfully serialized to RDF/XML: {rdf_file_path}")
    
    # 2. Write XSD files to validate the RDF/XML
    # Write master schema.xsd
    schema_xsd_path = os.path.join(current_dir, "schema.xsd")
    schema_content = """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
           xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
           xmlns:ex="http://example.org/ns#"
           xmlns:foaf="http://xmlns.com/foaf/0.1/"
           elementFormDefault="qualified">

  <!-- Import namespace schemas -->
  <xs:import namespace="http://example.org/ns#" schemaLocation="ex.xsd"/>
  <xs:import namespace="http://xmlns.com/foaf/0.1/" schemaLocation="foaf.xsd"/>

  <!-- Attributes used in RDF/XML -->
  <xs:attribute name="about" type="xs:anyURI"/>
  <xs:attribute name="resource" type="xs:anyURI"/>

  <!-- Root RDF element -->
  <xs:element name="RDF">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Description" maxOccurs="unbounded">
          <xs:complexType>
            <xs:choice maxOccurs="unbounded">
              <!-- rdf:type -->
              <xs:element name="type">
                <xs:complexType>
                  <xs:attribute ref="rdf:resource" use="required"/>
                </xs:complexType>
              </xs:element>
              <!-- ex: namespace predicates -->
              <xs:element ref="ex:studentOf"/>
              <xs:element ref="ex:studies"/>
              <xs:element ref="ex:worksAt"/>
              <!-- foaf: namespace predicates -->
              <xs:element ref="foaf:knows"/>
            </xs:choice>
            <xs:attribute ref="rdf:about" use="required"/>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
"""
    with open(schema_xsd_path, "w", encoding="utf-8") as f:
        f.write(schema_content)
    print(f"Master schema written: {schema_xsd_path}")

    # Write ex.xsd
    ex_xsd_path = os.path.join(current_dir, "ex.xsd")
    ex_content = """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.org/ns#"
           xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
           elementFormDefault="qualified">

  <xs:import namespace="http://www.w3.org/1999/02/22-rdf-syntax-ns#" schemaLocation="schema.xsd"/>

  <xs:element name="studentOf">
    <xs:complexType>
      <xs:attribute ref="rdf:resource" use="required"/>
    </xs:complexType>
  </xs:element>

  <xs:element name="studies">
    <xs:complexType>
      <xs:attribute ref="rdf:resource" use="required"/>
    </xs:complexType>
  </xs:element>

  <xs:element name="worksAt">
    <xs:complexType>
      <xs:attribute ref="rdf:resource" use="required"/>
    </xs:complexType>
  </xs:element>
</xs:schema>
"""
    with open(ex_xsd_path, "w", encoding="utf-8") as f:
        f.write(ex_content)
    print(f"ex.xsd schema written: {ex_xsd_path}")

    # Write foaf.xsd
    foaf_xsd_path = os.path.join(current_dir, "foaf.xsd")
    foaf_content = """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://xmlns.com/foaf/0.1/"
           xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
           elementFormDefault="qualified">

  <xs:import namespace="http://www.w3.org/1999/02/22-rdf-syntax-ns#" schemaLocation="schema.xsd"/>

  <xs:element name="knows">
    <xs:complexType>
      <xs:attribute ref="rdf:resource" use="required"/>
    </xs:complexType>
  </xs:element>
</xs:schema>
"""
    with open(foaf_xsd_path, "w", encoding="utf-8") as f:
        f.write(foaf_content)
    print(f"foaf.xsd schema written: {foaf_xsd_path}")

if __name__ == "__main__":
    main()
