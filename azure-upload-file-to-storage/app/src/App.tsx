import { BlockBlobClient } from '@azure/storage-blob';
import { Box, Button, Card, CardMedia, Grid, Typography } from '@mui/material';
import { ChangeEvent, useState } from 'react';
import ErrorBoundary from './components/error-boundary';
import { convertFileToArrayBuffer } from './lib/convert-file-to-arraybuffer';

import axios, { AxiosResponse } from 'axios';
import './App.css';
import './AppStyles.css'; // Import the new CSS file

// Used only for local development
const API_SERVER = import.meta.env.VITE_API_SERVER as string;

const request = axios.create({
  baseURL: API_SERVER,
  headers: {
    'Content-type': 'application/json'
  }
});

type SasResponse = {
  url: string;
};
type ListResponse = {
  list: string[];
};

function App() {
  const containerName = `upload`;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sasTokenUrl, setSasTokenUrl] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [list, setList] = useState<string[]>([]);

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const { target } = event;

    if (!(target instanceof HTMLInputElement)) return;
    if (
      target?.files === null ||
      target?.files?.length === 0 ||
      target?.files[0] === null
    )
      return;

    setSelectedFile(target?.files[0]);

    // reset
    setSasTokenUrl('');
    setUploadStatus('');
  };

  const handleFileSasToken = () => {
    const permission = 'w'; //write
    const timerange = 5; //minutes

    if (!selectedFile) return;

    request
      .post(
        `/api/sas?file=${encodeURIComponent(
          selectedFile.name
        )}&permission=${permission}&container=${containerName}&timerange=${timerange}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      .then((result: AxiosResponse<SasResponse>) => {
        const { data } = result;
        const { url } = data;
        setSasTokenUrl(url);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          const { message, stack } = error;
          setSasTokenUrl(`Error getting sas token: ${message} ${stack || ''}`);
        } else {
          setUploadStatus(error as string);
        }
      });
  };

  const handleFileUpload = () => {
    if (sasTokenUrl === '') return;

    convertFileToArrayBuffer(selectedFile as File)
      .then((fileArrayBuffer) => {
        if (
          fileArrayBuffer === null ||
          fileArrayBuffer.byteLength < 1 ||
          fileArrayBuffer.byteLength > 256000
        )
          return;

        const blockBlobClient = new BlockBlobClient(sasTokenUrl);
        return blockBlobClient.uploadData(fileArrayBuffer);
      })
      .then(() => {
        setUploadStatus('Successfully finished upload');
        return request.get(`/api/list?container=${containerName}`);
      })
      .then((result: AxiosResponse<ListResponse>) => {
        // Axios response
        const { data } = result;
        const { list } = data;
        setList(list);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          const { message, stack } = error;
          setUploadStatus(
            `Failed to finish upload with error : ${message} ${stack || ''}`
          );
        } else {
          setUploadStatus(error as string);
        }
      });
  };

  return (
    <>
      <Box className="appContainer">
        <ErrorBoundary>
          <Box className="header" m={4}>
              <Typography className="title" variant="h4" gutterBottom>
                COMPLETE THE OUTFIT
              </Typography>
              {/* ... rest of your components */}
          </Box>

            {/* File Selection Section */}
            <Box className="contentContainer">
              <Box className="buttonContainer">
                <Button className="button" variant="contained" component="label">
                  Select File
                  <input type="file" hidden onChange={handleFileSelection} />
                </Button>
                {selectedFile && selectedFile.name && (
                  <Box className="infoContainer">
                    <Typography className="infoText">{selectedFile.name}</Typography>
                  </Box>
                )}
              </Box>

              {/* SAS Token Section */}
              {selectedFile && selectedFile.name && (
                <Box className="buttonContainer">
                  <Button className="button" variant="contained" onClick={handleFileSasToken}>
                    Get Token to start
                  </Button>
                  {sasTokenUrl && (
                    <Box className="infoContainer">
                      <Typography className="infoText">{sasTokenUrl}</Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* File Upload Section */}
              {sasTokenUrl && (
                <Box className="buttonContainer">
                  <Button className="button" variant="contained" onClick={handleFileUpload}>
                    Start search
                  </Button>
                  {uploadStatus && (
                    <Box className="infoContainer">
                      <Typography className="infoText" gutterBottom>
                        {uploadStatus}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Uploaded Files Display */}
              <Grid container spacing={2}>
                {list.map((item) => (
                  <Grid item xs={6} sm={4} md={3} key={item}>
                    <Card>
                      {item.endsWith('.jpg') ||
                      item.endsWith('.png') ||
                      item.endsWith('.jpeg') ||
                      item.endsWith('.gif') ? (
                        <CardMedia component="img" image={item} alt={item} />
                      ) : (
                        <Typography variant="body1" gutterBottom>
                          {item}
                        </Typography>
                      )}
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
        </ErrorBoundary>
      </Box>
    </>
  );
}

export default App;
