import os
import sys
import json
import rdflib

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    rdf_path = os.path.join(current_dir, "knowledge_graph.rdf")
    
    # Check if a custom query is passed
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if os.path.exists(arg):
            with open(arg, 'r', encoding='utf-8') as f:
                query_str = f.read()
        else:
            query_str = arg
    else:
        # Default SPARQL query mapping to the paragraph relations
        query_str = """
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
        
    result = {
        "success": False,
        "results": [],
        "errors": []
    }
    
    try:
        if not os.path.exists(rdf_path):
            result["errors"].append(f"RDF graph file not found at {rdf_path}")
        else:
            g = rdflib.Graph()
            g.parse(rdf_path, format="xml")
            
            query_result = g.query(query_str)
            
            # Extract variables
            vars_list = [str(var) for var in query_result.vars]
            
            # Construct dictionary rows
            for row in query_result:
                row_dict = {}
                for idx, val in enumerate(row):
                    var_name = vars_list[idx]
                    row_dict[var_name] = str(val) if val is not None else ""
                result["results"].append(row_dict)
                
            result["success"] = True
    except Exception as e:
        result["errors"].append(f"SPARQL execution error: {str(e)}")
        
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
