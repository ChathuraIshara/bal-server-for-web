import { WebSocketServer } from "ws";
import { IncomingMessage, Server } from "node:http";
import { URL } from "node:url";
import { Socket } from "node:net";
import { type IWebSocket, RequestMessage, WebSocketMessageReader, WebSocketMessageWriter } from "vscode-ws-jsonrpc";
import { createConnection, createServerProcess, forward } from "vscode-ws-jsonrpc/lib/server";
import { Message, InitializeRequest, type InitializeResult, type InitializeParams, RegistrationParams, RegistrationRequest } from "vscode-languageserver-protocol";
import { LanguageName, LanguageServerRunConfig, SCHEME } from "./models";
import { getBallerinaHome, resolveAbsolutePath, resolveNotification, resolveRequestPath, resolveResponseMessage } from "./utils";
import { URI } from "vscode-uri";
import os from "os";
import { BASE_DIR } from "../file_system/fsRoutes";
import fs from "fs";
import path from "node:path";
import { orderBy } from 'lodash';
import net from "net";


interface JdkInfo {
    name: string;
    version: string;
    fullPath: string;
    parsedVersion: number[];
    buildNumber: number;
}

export const runBalServer = async (httpServer: Server) => {
  // Hardcoded JAR path
  const ballerinaLanguageServerJar = "/home/chathura/projects/intellij-bal-ls/build/ballerina-language-server-1.0.0-SNAPSHOT.jar";
  if (!fs.existsSync(ballerinaLanguageServerJar)) {
    throw new Error(`Custom language server JAR not found: ${ballerinaLanguageServerJar}`);
  }

  const ballerinaHomeOriginal = "/usr/lib/ballerina/distributions/ballerina-2201.12.3";
  const ballerinaHome="/usr/lib/ballerina/distributions/ballerina-2201.12.3";
  const baseHome = ballerinaHome.includes('distributions')
    ? ballerinaHome.substring(0, ballerinaHome.indexOf('distributions'))
    : ballerinaHome;
  console.log(`base Home: ${baseHome}`);
  const excludeJarPatterns = [
    'architecture-model*', 'flow-model*', 'graphql-model*', 'model-generator*',
    'sequence-model*', 'service-model*', 'test-manager-service*', 'language-server*',
    "bal-shell-service*", "org.eclipse.lsp4j*"
  ];
  const directoriesToSearch = [
    path.join(ballerinaHomeOriginal, 'bre', 'lib'),
    path.join(ballerinaHomeOriginal, 'lib', 'tools', 'lang-server', 'lib'),
    path.join(ballerinaHomeOriginal, 'lib', 'tools', 'debug-adapter', 'lib')
  ];
  const ballerinaJarPaths = directoriesToSearch.flatMap(directory =>
    findJarsExcludingPatterns(directory, excludeJarPatterns)
  );  
  const customPaths = [ballerinaLanguageServerJar, ...ballerinaJarPaths];
  const delimiter = os.platform() === "win32" ? ";" : ":";
  const classpath = customPaths.join(delimiter);

  // Find JDK
  const dependenciesDir = path.join("/usr/lib/ballerina", 'dependencies');
  console.log(`Searching for JDK in: ${dependenciesDir}`);
  const jdkDir = findHighestVersionJdk(dependenciesDir);
  console.log("jdkDir", jdkDir);
  if (!jdkDir) throw new Error(`JDK not found in ${dependenciesDir}`);
  const javaExecutable = os.platform() === "win32" ? 'java.exe' : 'java';
  const javaCmd = path.join(jdkDir, 'bin', javaExecutable);
  console.log("java cmd:", javaCmd);

  // Debug options
  let debugOpts = '';
  if (process.env.LSDEBUG === "true") {
    let debugPort = parseInt(process.env.LSDEBUG_PORT || "5009");  // Configurable port
    debugOpts = `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,quiet=y,address=${debugPort}`;
    console.log(`🐛 Debug mode enabled on port ${debugPort}`);
  }

  // JVM args
  const args = [
    '-cp', classpath,
    `-Dballerina.home=${ballerinaHome}`,
    'org.ballerinalang.langserver.launchers.stdio.Main'
  ];
  if (debugOpts) args.unshift(debugOpts);
  if (process.env.LS_CUSTOM_ARGS) args.push(...process.env.LS_CUSTOM_ARGS.split(' '));

  // Environment
  const env = { ...process.env };
  if (process.env.LS_EXTENSIONS_PATH && process.env.LS_EXTENSIONS_PATH !== "") {
    if (env.BALLERINA_CLASSPATH_EXT) {
      env.BALLERINA_CLASSPATH_EXT += delimiter + process.env.LS_EXTENSIONS_PATH;
    } else {
      env.BALLERINA_CLASSPATH_EXT = process.env.LS_EXTENSIONS_PATH;
    }
  }

  // Start the language server
  runLanguageServer({
    serverName: "bal",
    pathName: "/bal",
    serverPort: 9090,
    runCommand: javaCmd,
    runCommandArgs: args,
    spawnOptions: {
      shell: true,
      env: env
    },
    wsServerOptions: {
      noServer: true,
      perMessageDeflate: false,
      clientTracking: true,
    },
    logMessages: true,
  }, httpServer);
};
function extractJdkInfo(fileName: string, directory: string): JdkInfo | null {
    const jdkPattern = /^jdk-(.+)-jre$/;
    const match = fileName.match(jdkPattern);
    if (!match) {
        return null;
    }
    
    const versionString = match[1];
    const { parsedVersion, buildNumber } = parseJdkVersion(versionString);
    
    return {
        name: fileName,
        version: versionString,
        fullPath: path.join(directory, fileName),
        parsedVersion,
        buildNumber
    };
}
function parseJdkVersion(versionString: string): { parsedVersion: number[], buildNumber: number } {
    const [mainVersion, buildPart] = versionString.split('+');
    
    const parsedVersion = mainVersion
        .split('.')
        .map(num => parseInt(num, 10) || 0);
    
    const buildNumber = parseInt(buildPart || '0', 10);
    
    return { parsedVersion, buildNumber };
}

export function findHighestVersionJdk(directory: string): string | null {
    try {
        if (!fs.existsSync(directory)) {
          console.log("inside findhighestVersionJdk not found");
           // debug(`Dependencies directory not found: ${directory}`);
            return null;
        }
        
        const files = fs.readdirSync(directory);
       // debug(`Found files in dependencies directory: ${files.join(', ')}`);
        
        const jdkInfos = files
            .map(file => extractJdkInfo(file, directory))
            .filter((jdk): jdk is JdkInfo => jdk !== null);
        if (jdkInfos.length === 0) {
           // debug(`No JDK directories found matching pattern in: ${directory}`);
            return null;
        }
        
        const sortedJdks = orderBy(jdkInfos, [
            // sort by major version (descending)
            (jdk: JdkInfo) => jdk.parsedVersion[0] || 0,
            // sort by minor version (descending)
            (jdk: JdkInfo) => jdk.parsedVersion[1] || 0,
            // sort by patch version (descending)
            (jdk: JdkInfo) => jdk.parsedVersion[2] || 0,
            // sort by build number (descending)
            (jdk: JdkInfo) => jdk.buildNumber
        ], ['desc', 'desc', 'desc', 'desc']);
        
        const highestVersionJdk = sortedJdks[0];
        
       // debug(`Selected JDK: ${highestVersionJdk.name} at ${highestVersionJdk.fullPath}`);
        return highestVersionJdk.fullPath;
        
    } catch (error) {
        console.error(`Error reading directory ${directory}:`, error);
        return null;
    }
}

export const runLanguageServer = (
  languageServerRunConfig: LanguageServerRunConfig,
  httpServer: Server
) => {
  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception: ", err.toString());
    if (err.stack !== undefined) {
      console.error(err.stack);
    }
  });

  const wss = new WebSocketServer(languageServerRunConfig.wsServerOptions);
  upgradeWsServer(languageServerRunConfig, {
    server: httpServer,
    wss,
  });
};

export const upgradeWsServer = (runconfig: LanguageServerRunConfig, config: { server: Server; wss: WebSocketServer; }) => {
  config.server.on("upgrade", (request: IncomingMessage, socket: Socket, head: Buffer) => {
    const baseURL = `http://${request.headers.host}/`;
    const pathName =
      request.url !== undefined
        ? new URL(request.url, baseURL).pathname
        : undefined;

    if (pathName === runconfig.pathName) {
      config.wss.handleUpgrade(request, socket, head, (webSocket) => {
        const socket: IWebSocket = {
          send: (content) =>
            webSocket.send(content, (error) => {
              if (error) {
                throw error;
              }
            }),
          onMessage: (cb) =>
            webSocket.on("message", (data) => {
              cb(data);
            }),
          onError: (cb) => webSocket.on("error", cb),
          onClose: (cb) => webSocket.on("close", cb),
          dispose: () => webSocket.close(),
        };
        // launch the server when the web socket is opened
        if (webSocket.readyState === webSocket.OPEN) {
          launchLanguageServer(runconfig, socket);
        } else {
          webSocket.on("open", () => {
            launchLanguageServer(runconfig, socket);
          });
        }
      });
    }
  }
  );
};
function findJarsExcludingPatterns(directory: string, excludePatterns: string[]): string[] {
    try {
        if (!fs.existsSync(directory)) {
            return [];
        }
        const files = fs.readdirSync(directory);
        const matchingJars: string[] = [];
        
        const compiledPatterns = excludePatterns.map(pattern => new RegExp(pattern.replace(/\*/g, '.*')));
        
        files.forEach(file => {
            if (file.endsWith('.jar')) {
                const shouldExclude = compiledPatterns.some(regex => regex.test(file));
                
                if (!shouldExclude) {
                    matchingJars.push(path.join(directory, file));
                }
            }
        });
        
        return matchingJars;
    } catch (error) {
        console.error(`Error reading directory ${directory}:`, error);
        return [];
    }
}
export const launchLanguageServer = (runconfig: LanguageServerRunConfig, socket: IWebSocket) => {

  const reader = new WebSocketMessageReader(socket);
  const writer = new WebSocketMessageWriter(socket);
  const socketConnection = createConnection(reader, writer, () =>
  socket.dispose()
  );

  const { serverName, runCommand, runCommandArgs, spawnOptions } = runconfig;
  const serverConnection = createServerProcess(serverName, runCommand, runCommandArgs, spawnOptions);

  if (serverConnection !== undefined) {
    forward(socketConnection, serverConnection, (message) => {
      console.log("Message received by server: ", message);
      message = resolveAbsolutePath(JSON.stringify(message));
      if (Message.isRequest(message)) { 
        console.log("this is Request",message);
        let reqMessage = resolveRequestPath(message)
        if (runconfig.logMessages ?? false) {
          console.log(`${serverName} Server received: ${reqMessage.method}`);
          console.log(reqMessage);
        }
        if (runconfig.requestMessageHandler !== undefined) {
          return runconfig.requestMessageHandler(reqMessage);
        }
      } else if (Message.isResponse(message)) {
        let resMessage = resolveResponseMessage(message)
        if (runconfig.logMessages ?? false) {
          console.log("tring to sent response by server");
          console.log(`${serverName} Servering sent:`);
          console.log(resMessage);
        }
        if (runconfig.responseMessageHandler !== undefined) {
          return runconfig.responseMessageHandler(resMessage);
        }
      } else if (Message.isNotification(message)) {
        if (runconfig.logMessages ?? false) {
          console.log(`${serverName} Server sent/received notification:`);
          console.log(message);
          resolveNotification(message);
          console.log("after resolveNotification", message);
        }
        if (runconfig.NotificationMessageHandler !== undefined) {
          return runconfig.NotificationMessageHandler(message);
        }
      }
      return message;
    });
  }
};

function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      // Try next port
      findAvailablePort(startPort + 1).then(resolve).catch(reject);
    });
  });
}
