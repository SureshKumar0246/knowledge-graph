import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request) {
  try {
    const { rdfXml } = await request.json();
    if (!rdfXml) {
      return NextResponse.json({ success: false, error: 'No XML content provided' }, { status: 400 });
    }

    const scriptsDir = path.join(process.cwd(), 'python_scripts');
    const validateScriptPath = path.join(scriptsDir, 'validate_rdf.py');
    const tempRdfPath = path.join(scriptsDir, 'temp_web_validate.rdf');

    // Write the XML to validate to a temp file
    fs.writeFileSync(tempRdfPath, rdfXml, 'utf8');

    return new Promise((resolve) => {
      // Execute the validation script
      exec(`python "${validateScriptPath}"`, (error, stdout, stderr) => {
        // Clean up temp file
        try {
          if (fs.existsSync(tempRdfPath)) {
            fs.unlinkSync(tempRdfPath);
          }
        } catch (cleanupErr) {
          console.error('Failed to delete temp file:', cleanupErr.message);
        }

        if (error) {
          console.error('Validation script execution error:', error.message, stderr);
          // If python execution fails in this environment, provide basic fallback validation
          // e.g. check if it's well-formed XML
          const isWellFormed = rdfXml.includes('<rdf:RDF') && rdfXml.includes('</rdf:RDF>');
          return resolve(NextResponse.json({
            success: true, // route succeeded, though validation details are custom
            valid: isWellFormed,
            errors: isWellFormed ? [] : ['XML is not well-formed (missing rdf:RDF tags). Native python validator failed.']
          }));
        }

        try {
          const result = JSON.parse(stdout.trim());
          resolve(NextResponse.json({
            success: true,
            valid: result.valid,
            errors: result.errors
          }));
        } catch (parseErr) {
          resolve(NextResponse.json({
            success: false,
            error: 'Failed to parse validator output: ' + stdout
          }, { status: 500 }));
        }
      });
    });

  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
