import axios from 'axios';
import { exec } from 'child_process';
import { Agent } from 'https';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configure custom HTTPS agent to handle connectivity issues
const httpsAgent = new Agent({
  keepAlive: true,
  timeout: 60000,
  family: 4, // Force IPv4 only to avoid IPv6 issues
});

// Configure axios defaults for better connectivity
const axiosInstance = axios.create({
  timeout: 60000, // Increased to 60 seconds
  maxRedirects: 10,
  httpsAgent,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    Connection: 'keep-alive',
  },
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fallback method using curl
const fetchWithCurl = async (url: string): Promise<string> => {
  try {
    const { stdout } = await execAsync(
      `curl -L --connect-timeout 30 --max-time 60 -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" "${url}"`,
    );
    return stdout;
  } catch (error) {
    throw new Error(`Curl failed: ${(error as Error).message}`);
  }
};

// Reusable function to fetch HTML data with axios + curl fallback and retry logic
export const fetchRawData = async (
  url: string,
  retries = 3,
): Promise<string> => {
  let lastError: Error | undefined = undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Fetching ${url} - Attempt ${attempt}/${retries}...`);

      try {
        const response = await axiosInstance.get<string>(url);
        return response.data;
      } catch (_err) {
        console.warn(`Axios failed for ${url}, trying curl fallback...`);
        return await fetchWithCurl(url);
      }
    } catch (_error) {
      const error = _error as Error;
      lastError = error;
      console.error(`Fetch attempt ${attempt} failed:`, error);

      if (attempt < retries) {
        const waitTime = attempt * 5000; // Progressive delay: 5s, 10s, 15s
        console.log(`Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      }
    }
  }

  if (lastError !== undefined) throw lastError;

  return '';
};
