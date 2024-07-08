import { useRef, useState } from 'react';
import Papa from 'papaparse';

const App = () => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const maxChunkSize = 1024 * 1024;

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFileName(file.name);
    setSelectedFile(file);
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      console.error("No file selected");
      return;
    }

    const fileText = await selectedFile.text();
    console.log(fileText)
    console.log(fileText.length)
    let startIndex = 0;

    while (startIndex < fileText.length) {
      const endIndex = Math.min(startIndex + maxChunkSize, fileText.length);
      const chunkText = fileText.slice(startIndex, endIndex);

      Papa.parse(chunkText, {
        complete: async (results) => {
          const chunk = results.data;
          const variables = { data: chunk, completed: endIndex === fileText.length || false };

          const query = `
            mutation ProcessCSV($data: [[String]]!, $completed: Boolean!) {
              processCSV(data: $data, completed: $completed) {
                success
                message
              }
            }
          `;

          try {
            const res = await fetch("http://localhost:4001/graphql", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query,
                variables,
              }),
            });

            if (!res.ok) {
              throw new Error(`Upload failed with status: ${res.status}`);
            }

            const data = await res.json();
            console.log(`Chunk upload returned:`, data);
          } catch (error) {
            console.error(`Chunk upload error:`, error);
          }
        },
        error: (error) => {
          console.error("CSV parsing error:", error);
        }
      });

      startIndex = endIndex;
    }
  };

  const handleTest = async () => {
    const name = "kavi";
    const query = `
      query Hello($name: String!) {
        hello(name: $name)
      }
    `;

    try {
      const res = await fetch("http://localhost:4001/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: { name },
        }),
      });

      const data = await res.json();
      console.log("data returned:", data);
    } catch (error) {
      console.error("Test error:", error);
    }
  };

  return (
    <div className="mx-auto w-fit mt-20 py-10 px-10 rounded-md shadow-lg flex items-center justify-center flex-col">
      <button onClick={handleClick} className="font-bold text-xl mb-4">Upload File</button>
      {selectedFileName && <p>Selected file: {selectedFileName}</p>}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx,.xls,.csv"
      />
      {selectedFileName && <button className='bg-blue-600 text-white py-2 px-4 m-4 rounded-md cursor-pointer' onClick={handleUpload}>Send</button>}
      <button className='bg-blue-600 text-white py-2 px-4 rounded-md cursor-pointer' onClick={handleTest}>Test</button>
    </div>
  );
};

export default App;
