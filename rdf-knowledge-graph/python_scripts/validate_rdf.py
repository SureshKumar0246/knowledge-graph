import os
import sys
import json
import xmlschema

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    rdf_path = os.path.join(current_dir, "knowledge_graph.rdf")
    schema_path = os.path.join(current_dir, "schema.xsd")
    
    # If a custom XML string is passed via command-line arguments, validate that instead.
    if len(sys.argv) > 1:
        custom_xml_content = sys.argv[1]
        temp_xml_path = os.path.join(current_dir, "temp_validate.rdf")
        with open(temp_xml_path, "w", encoding="utf-8") as f:
            f.write(custom_xml_content)
        xml_to_validate = temp_xml_path
    else:
        xml_to_validate = rdf_path
        temp_xml_path = None

    result = {
        "valid": False,
        "errors": []
    }
    
    try:
        if not os.path.exists(schema_path):
            result["errors"].append(f"Schema file not found at {schema_path}")
        elif not os.path.exists(xml_to_validate):
            result["errors"].append(f"XML file to validate not found at {xml_to_validate}")
        else:
            # Initialize schema and validate
            schema = xmlschema.XMLSchema(schema_path)
            
            # Use iter_errors to collect all errors instead of raising on first
            errors = list(schema.iter_errors(xml_to_validate))
            
            if not errors:
                result["valid"] = True
            else:
                for err in errors:
                    result["errors"].append(str(err))
    except Exception as e:
        result["errors"].append(f"Validation engine error: {str(e)}")
    finally:
        # Cleanup temp file if it was created
        if temp_xml_path and os.path.exists(temp_xml_path):
            try:
                os.remove(temp_xml_path)
            except:
                pass
                
    # Output the result as JSON
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
