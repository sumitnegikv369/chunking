import { useRef, useState } from 'react';
// import Papa from 'papaparse';

const App = () => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFileName(file.name);
    setSelectedFile(file);
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const uploadChunk = async (chunk, selectedFile, endIndex, retries = 3) => {
    const fileExtension = selectedFile.name.split('.').pop();
    const query = `
    mutation ProcessChunk($data: [Uint8Array!]!, $completed: Boolean!, $extension: String!) {
      processChunk(data: $data, completed: $completed, extension: $extension) {
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
          variables: { data: [Array.from(new Uint8Array(chunk))], completed: endIndex === selectedFile.size || false, extension: fileExtension },
        }),
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status: ${res.status}`);
      }

      const data = await res.json();
      console.log(`Chunk upload returned:`, data);
    } catch (error) {
      if (retries > 0) {
        await uploadChunk(chunk, selectedFile, endIndex, retries - 1);
      } else {
        console.error('Failed to upload chunk: ', error);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      console.error("No file selected");
      return;
    }
    const chunkSize = 512 * 1024;
    let start = 0;

    while (start < selectedFile.size) {
      const reader = new FileReader();
      reader.readAsArrayBuffer(selectedFile.slice(start, start + chunkSize));
      await new Promise((resolve, reject) => {
        reader.onload = async (event) => {
          await uploadChunk(event.target.result, selectedFile, Math.min(start + chunkSize, selectedFile.size));
          resolve();
        };
        reader.onerror = (error) => {
          console.error("Error reading file chunk:", error);
          reject(error);
        };
      });
      start += chunkSize;
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
        // accept=".xlsx,.xls,.csv"
      />
      {selectedFileName && <button className='bg-blue-600 text-white py-2 px-4 m-4 rounded-md cursor-pointer' onClick={handleUpload}>Send</button>}
      <button className='bg-blue-600 text-white py-2 px-4 rounded-md cursor-pointer' onClick={handleTest}>Test</button>
    </div>
  );
};

export default App;
