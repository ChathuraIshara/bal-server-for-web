import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { LanguageName, SCHEME } from "./models";
import { BASE_DIR, BASE_DIR_1 } from "../file_system/fsRoutes";
import * as path from "path";
import os from "os";
import { exec } from 'child_process';
import { InitializeParams, InitializeRequest, NotificationMessage, RegistrationParams, RegistrationRequest, RequestMessage, ResponseMessage } from "vscode-languageserver-protocol";
import { URI } from "vscode-uri";

export const COMMAND_NOT_FOUND = "command not found";
export const NO_SUCH_FILE = "No such file or directory";
export const ERROR = "Error:";
const BASE_REPO_DIR = '/home/my-project/Cloud-editor/bal-server-for-web/repos';

export interface BallerinaHome {
  userHome: string,
  ballerinaHome: string,
  distPath: string,
  ballerinaCmd: string,
  ballerinaVersionText: string,
  ballerinaVersion: string
}

export const getLocalDirectory = (referenceUrl: string | URL) => {
  const __filename = fileURLToPath(referenceUrl);
  return dirname(__filename);
};

// windows fix
// export const resolvePath = (message: string) => {
//   if (message.includes(`${SCHEME}:`)) { // messages from client
//     message = message.replace(new RegExp(`${SCHEME}:`, 'g'), `file:///${BASE_DIR}`);
//   }
//   else if (message.includes(`${BASE_DIR}`) || message.includes("bala:/") || message.includes("file:/")) { // messages from lang server
//     message = message.replace(new RegExp("bala:/", 'g'), "bala://");
//     message = message.replace(new RegExp(`file:///${BASE_DIR}`, 'g'), `${SCHEME}:`);
//     message = message.replace(new RegExp(`file:///`, 'g'), `bala://`);
//     message = message.replace(new RegExp(`${BASE_DIR}`, 'g'), "");
//   }
//   return JSON.parse(message);
// }

// linux fix
// export const resolvePath = (message: string) => {
//   if (message.includes(`${SCHEME}:`)) { // messages from client
//     message = message.replace(new RegExp(`${SCHEME}:`, 'g'), `file://${BASE_DIR}`);
//   }
//   else if (message.includes(`${BASE_DIR}`)) { // messages from lang server
//     message = message.replace(new RegExp(`file://${BASE_DIR}`, 'g'), `${SCHEME}:`);
//     message = message.replace(new RegExp(`${BASE_DIR}`, 'g'), "");
//   }
//   return JSON.parse(message);
// }

export const resolveAbsolutePath = (message: string) => {
  const fileScheme = os.platform() === "win32" ? "file:///" : "file://";

  if (message.includes(`${SCHEME}:`)) { // messages from client
    message = message.replace(new RegExp(`${SCHEME}:`, 'g'), `${fileScheme}${BASE_DIR}`);
  } else if (
    message.includes(`${BASE_DIR}`) ||
    message.includes("bala:/") ||
    message.includes("file:/")) { // messages from lang server
    message = os.platform() === "win32" ? message.replace(new RegExp("bala:/", 'g'), "bala://") : message;
    message = message.replace(new RegExp(`${fileScheme}${BASE_DIR}`, 'g'), `${SCHEME}:`);
    message = message.replace(new RegExp(`${fileScheme}${BASE_DIR_1}`, 'g'), `${SCHEME}:`);
    message = os.platform() === "win32" ? message.replace(new RegExp(`${fileScheme}`, 'g'), `bala://`) : message;
    message = message.replace(new RegExp(`${BASE_DIR}`, 'g'), "");
    message = message.replace(new RegExp(`${BASE_DIR_1}`, 'g'), `${SCHEME}:`);
  }
  return JSON.parse(message);
}

export function resolveRequestPath(message: RequestMessage) {
  switch (message.method) {
    case InitializeRequest.type.method:
      const initializeParams = message.params as InitializeParams;
      initializeParams.processId = process.pid;
      break;
    case RegistrationRequest.method:
      const registrationParams = message.params as RegistrationParams;
      if (registrationParams.registrations.length > 0) {
        registrationParams.registrations[0].registerOptions
          .documentSelector.push({ language: LanguageName.ballerina, scheme: `${SCHEME}` })
      }
      break;
    case "typesManager/getTypes":
    case "typesManager/updateType":
    case "xmlToRecordTypes/convert":
    case "serviceDesign/updateFunction":
    case "serviceDesign/getListenerFromSource":
    case "serviceDesign/updateListener":
    case "bi-diagram/getVisibleVariableTypes":
    case "serviceDesign/updateService":
    case "expressionEditor/visibleVariableTypes":
    case "serviceDesign/getListeners":
    case "serviceDesign/getServiceModel":
    case "serviceDesign/addListener":
    case "typesManager/updateTypes":
    case "flowDesignService/deleteFlowNode":
    case "typesManager/createGraphqlClassType":
    case "typesManager/getGraphqlType":
    case "serviceDesign/addFunction":
    case "serviceDesign/getServiceClassModelFromSource":
    case "serviceDesign/updateClassField":
    case "serviceDesign/addField":
      console.log(">>> case: ", message.method);
      console.log("message params", message.params);
      if (message.params && "filePath" in message.params && message.params.filePath) {
        const inputPath = message.params.filePath as string;
        const fixedPath = URI.parse(inputPath).path;
        message.params.filePath = fixedPath;
        console.log("fixedPath: ", fixedPath);
      }
      break;
    case "jsonToRecordTypes/convert":
      if (message.params && "filePathUri" in message.params && message.params.filePathUri) {
        const inputPath = message.params.filePathUri as string;
        const fixedPath = URI.parse(inputPath).path.substring(1);
        message.params.filePathUri = fixedPath;
      }
      break;
    case "designModelService/getDesignModel":
    case "configEditor/getConfigVariables":
    case "icpService/isIcpEnabled":
      if (message.params && "projectPath" in message.params && message.params.projectPath) {
        const inputPath = message.params.projectPath as string;
        const fixedPath = URI.parse(inputPath).path;
        message.params.projectPath = fixedPath;
        console.log("fixedPath: ", fixedPath);
      }
      break;
    case "configEditor/updateConfigVariables":
      if (message.params && "configFilePath" in message.params && message.params.configFilePath) {
        const inputPath = message.params.configFilePath as string;
        const fixedPath = URI.parse(inputPath).path.substring(1);
        message.params.configFilePath = fixedPath;
      }
      break;
    case "serviceDesign/addService":
      if (message.params && "filePath" in message.params && message.params.filePath) {
        const inputPath = message.params.filePath as string;
        const fixedPath = URI.parse(inputPath).path.substring(1);
        message.params.filePath = fixedPath;
      }
      if (message.params && "service" in message.params
        && typeof message.params.service === "object" && message.params.service &&
        "properties" in message.params.service && typeof message.params.service.properties === "object" && message.params.service.properties
        && "designApproach" in message.params.service.properties && typeof message.params.service.properties.designApproach === "object" && message.params.service.properties.designApproach
        && "choices" in message.params.service.properties.designApproach && Array.isArray(message.params.service.properties.designApproach.choices) && message.params.service.properties.designApproach.choices
      ) {
        const choices = message.params.service.properties.designApproach.choices as any[];
        const specUri = choices[1].properties.spec.value as string;
        if (specUri) {
          const fixedPath = URI.parse(specUri).path.substring(1);
          message.params.service.properties.designApproach.choices[1].properties.spec.value = fixedPath;
        }
      }
      break;
    case "openAPILSExtension/generateOpenAPI":
      if (message.params && "documentFilePath" in message.params && message.params.documentFilePath) {
        const inputPath = message.params.documentFilePath as string;
        const fixedPath = URI.parse(inputPath).path.substring(1);
        message.params.documentFilePath = fixedPath;
      }
      break;
    case "flowDesignService/functionDefinition":
      if (message.params && "fileName" in message.params && message.params.fileName) {
        const inputPath = message.params.fileName as string;
        const fixedPath = URI.parse(inputPath).path.substring(1);
        message.params.fileName = fixedPath;
      }
      if (message.params && "projectPath" in message.params && message.params.projectPath) {
        const inputPath = message.params.projectPath as string;
        const fixedPath = URI.parse(inputPath).path.substring(1);
        message.params.projectPath = fixedPath;
      }
      break;
    case "persistERGeneratorService/getPersistERModels":
      if (message.params && "documentUri" in message.params && message.params.documentUri) {
        const inputPath = message.params.documentUri as string;
        const fixedPath = URI.parse(inputPath).path.substring(1);
        message.params.documentUri = fixedPath;
      }
      break;
    case "ballerinaDocument/syntaxTree":
      console.log("ballerinaDocument/syntaxTree");
      if (
        message.params &&
        typeof message.params === "object" &&
        "documentIdentifier" in message.params &&
        message.params.documentIdentifier &&
        typeof message.params.documentIdentifier === "object" &&
        "uri" in message.params.documentIdentifier &&
        typeof message.params.documentIdentifier.uri === "string"
      ) {
        console.log("inside syntaxTree: ", message.params.documentIdentifier.uri);
        const inputUri = message.params.documentIdentifier.uri as string;
        const relative = decodeURIComponent(URI.parse(inputUri).path).replace(/^\//, "");
        const absPath = path.join(BASE_DIR, relative);
        const fileUri = URI.file(absPath).toString();
        console.log("fileuri in syntax tree",fileUri);
        message.params.documentIdentifier.uri =normalizeFilePathForSyntaxTree(inputUri);
        console.log("syntaxTree file URI:", message.params.documentIdentifier.uri);
      }
      break;
    case "flowDesignService/getEnclosedFunctionDef":
      if (message.params && "filePath" in message.params && message.params.filePath) {
        console.log("flowDesignService/getEnclosedFunctionDef:file path incoming", message.params.filePath);
        const inputPath = message.params.filePath as string;
        const fixedPath = URI.parse(inputPath).path;
        message.params.filePath = normalizePath(message.params.filePath as string);
        console.log("flowDesignService/getEnclosedFunctionDef:file path", message.params.filePath);
      }
      break;
    case "serviceDesign/getServiceFromSource":
      if (message.params && "filePath" in message.params && message.params.filePath) {
        console.log("serviceDesign/getServiceFromSource:file path incoming", message.params.filePath);
        const inputPath = message.params.filePath as string;
        const fixedPath = URI.parse(inputPath).path;
        message.params.filePath = normalizePath(message.params.filePath as string);
        console.log("changed service design file path")
        console.log("serviceDesign/getServiceFromSource:file path", message.params.filePath);
      }
      break;
    case "flowDesignService/getFlowModel":
      if (message.params && "filePath" in message.params && message.params.filePath) {
        console.log("flowDesignService/getFlowModel:file path incoming", message.params.filePath);
        const inputPath = message.params.filePath as string;
        const fixedPath = URI.parse(inputPath).path;
        message.params.filePath =normalizePath(message.params.filePath as string);
        console.log("flowDesignService/getFlowModel:file path", message.params.filePath);
      }
    break;
   case "sequenceModelGeneratorService/getSequenceDiagramModel":
  if (message.params && "filePath" in message.params && message.params.filePath) {
    console.log("input path of sequence model generator service", message.params.filePath);
    const inputPath = message.params.filePath as string;
    const normalized = inputPath.replace(/\\/g, '/');
    
    // Remove any existing BASE_DIR prefix to avoid duplication
    const cleanPath = normalized.startsWith(BASE_DIR) 
      ? normalized.substring(BASE_DIR.length)
      : normalized;
    
    // Construct the proper absolute path
    const fixedPath = path.join(BASE_DIR, cleanPath);
    
    // Ensure the path is properly normalized
    message.params.filePath = path.normalize(fixedPath);
    console.log("sequenceModelGeneratorService/getSequenceDiagramModel: fixed file path", message.params.filePath);
  }
  case "serviceDesign/addResource":
    if(message.params && "filePath" in message.params && message.params.filePath) {
      console.log("input path of add resource", message.params.filePath);
      message.params.filePath="/home/my-project/Cloud-editor/bal-server-for-web/repos/ChathuraIshara/post-intergration/main.bal";
      console.log("add resource new file path", message.params.filePath);
    }
  break;
  case "flowDesignService/getAvailableNodes":
     if (message.params && "filePath" in message.params && message.params.filePath) {
        console.log("flowDesignService/getAvailableNodes:file path incoming", message.params.filePath);
        const inputPath = message.params.filePath as string;
        message.params.filePath =normalizePath(message.params.filePath as string);
        console.log("flowDesignService/getAvailableNodes:file path", message.params.filePath);
      }
  break;
  case "flowDesignService/search":
      if (message.params && "filePath" in message.params && message.params.filePath) {
        console.log("flowDesignService/search:file path incoming", message.params.filePath);
        const inputPath = message.params.filePath as string;
        message.params.filePath =normalizePath(message.params.filePath as string);
        console.log("flowDesignService/search:file path", message.params.filePath);
      }
  break;
  case "flowDesignService/getCopilotContext":
      if (message.params && "filePath" in message.params && message.params.filePath) {
        console.log("fflowDesignService/getCopilotContext:file path incoming", message.params.filePath);
        const inputPath = message.params.filePath as string;
        message.params.filePath =normalizePath(message.params.filePath as string);
        console.log("flowDesignService/getCopilotContext:file path", message.params.filePath);
      }
  break;
  case "flowDesignService/getNodeTemplate":
     if (message.params && "filePath" in message.params && message.params.filePath) {
        console.log("fflowDesignService/getNodeTemplate:file path incoming", message.params.filePath);
        const inputPath = message.params.filePath as string;
        message.params.filePath =normalizePath(message.params.filePath as string);
        console.log("flowDesignService/getNodeTemplate:file path", message.params.filePath);
      }
  break;
   case "dataMapper/visualizable":
     if (message.params && "filePath" in message.params && message.params.filePath) {
        console.log("dataMapper/visualizable:file path incoming", message.params.filePath);
        const inputPath = message.params.filePath as string;
        message.params.filePath =normalizePath(message.params.filePath as string);
        console.log("dataMapper/visualizable:file path", message.params.filePath);
      }
  break;
   case "flowDesignService/getSourceCode":
     if (message.params && "filePath" in message.params && message.params.filePath) {
        console.log("flowDesignService/getSourceCode:file path incoming", message.params.filePath);
        const inputPath = message.params.filePath as string;
        message.params.filePath =normalizePath(message.params.filePath as string);
        console.log("flowDesignService/getSourceCode:file path", message.params.filePath);
      }
  break;
   case "ballerinaDocument/syntaxTreeModify":
     if (
        message.params &&
        typeof message.params === "object" &&
        "documentIdentifier" in message.params &&
        message.params.documentIdentifier &&
        typeof message.params.documentIdentifier === "object" &&
        "uri" in message.params.documentIdentifier &&
        typeof message.params.documentIdentifier.uri === "string"
      ) {
        console.log("inside syntaxTreeModify: ", message.params.documentIdentifier.uri);
        const inputUri = message.params.documentIdentifier.uri as string;
        const relative = decodeURIComponent(URI.parse(inputUri).path).replace(/^\//, "");
        const absPath = path.join(BASE_DIR, relative);
        const fileUri = URI.file(absPath).toString();
        console.log("fileuri in syntax tree modify",fileUri);
        message.params.documentIdentifier.uri =normalizeFilePathForSyntaxTreeModify(inputUri);
        console.log("syntaxTree modify file URI:", message.params.documentIdentifier.uri);
      }
  break;
  case "designModelService/artifacts":
      if (message.params && "projectPath" in message.params && message.params.projectPath) {
        console.log("designModelService/artifacts: projectPath incoming", message.params.projectPath);
        const inputPath = message.params.projectPath as string;
        const fixedPath = URI.parse(inputPath).path;
       // message.params.projectPath = fixedPath;
        console.log("fixedPath of designModelService/artifacts: ", fixedPath);
      }
  case "expressionEditor/diagnostics":
     if (message.params && "filePath" in message.params && message.params.filePath) {
        console.log("expressionEditor/diagnostics:file path incoming", message.params.filePath);
        const inputPath = message.params.filePath as string;
        message.params.filePath =normalizePath(message.params.filePath as string);
        console.log("expressionEditor/diagnostics:file path", message.params.filePath);
      }
  break;
  case "expressionEditor/types":
     if (message.params && "filePath" in message.params && message.params.filePath) {
        console.log("expressionEditor/types:file path incoming", message.params.filePath);
        const inputPath = message.params.filePath as string;
        message.params.filePath =normalizeTypePath(message.params.filePath as string);
        console.log("expressionEditor/types:file path", message.params.filePath);
      }
  break;
  default:
      console.log(">>> default: ", message.method);
  }
  return message;
}

export function resolveResponseMessage(message: ResponseMessage) {
  if (message.result
    && typeof message.result === "object"
    && "designModel" in message.result &&
    message.result.designModel
  ) {
    console.log("..inside designModel: ", message.result.designModel);
    const { connections, listeners, services } = message.result.designModel as { connections: any[], listeners: any[], services: any[] }
    connections.forEach(conn => {
      const oldFilePath = conn.location.filePath as string;
      let fixedPath = oldFilePath.replace(/\\/g, "/").replace(BASE_DIR, "");
      fixedPath = `${SCHEME}:${fixedPath}`
      conn.location.filePath = fixedPath;
    });
    listeners.forEach(listener => {
      const oldFilePath = listener.location.filePath as string;
      let fixedPath = oldFilePath.replace(/\\/g, "/").replace(BASE_DIR, "")
      fixedPath = `${SCHEME}:${fixedPath}`
      listener.location.filePath = fixedPath;
    });
    services.forEach(service => {
      const oldFilePath = service.location.filePath as string;
      let fixedPath = oldFilePath.replace(/\\/g, "/").replace(BASE_DIR, "")
      fixedPath = `${SCHEME}:${fixedPath}`
      service.location.filePath = fixedPath;
    });
  }
  else {
    console.log("... no designModel: ", message);
    if (message.result && typeof message.result === "object" && message.result !== null) {
      if ("textEdits" in message.result && typeof message.result.textEdits === "object" && message.result.textEdits !== null) {
        // const oldTextEdits = message.result.textEdits as Record<string, any>;
        // const newTextEdits: Record<string, any> = {};
        // for (const key of Object.keys(oldTextEdits)) {
        //   // Only change the key, keep the value as is
        //   const newKey = key.startsWith("web-bala:") ? key : `web-bala:${key}`;
        //   newTextEdits[newKey] = oldTextEdits[key];
        // }
        // message.result.textEdits = newTextEdits;
      }
      console.log("... message.result: ", message.result);
    }
  }

  return message;
}

function normalizePath(inputPath: string): string {
  // Case 1: Handle file:// URIs
  if (inputPath.startsWith('file://')) {
    return fileURLToPath(inputPath);
  }

  // Case 2: Handle relative-looking paths (e.g., /ChathuraIshara/...)
  if (inputPath.startsWith('/') && !inputPath.startsWith(BASE_REPO_DIR)) {
    // Remove leading slash if it's not part of the base dir
    const relativePath = inputPath.startsWith('/') 
      ? inputPath.substring(1) 
      : inputPath;
    return path.join(BASE_REPO_DIR, relativePath);
  }

   // Case 3: Only filename (e.g., main.bal)
  // if (!inputPath.includes('/') && !inputPath.includes('\\')) {
  //   // Set your default subdirectory here:
  //   const defaultSubDir = 'ChathuraIshara/post-intergration';
  //   return path.join(BASE_REPO_DIR, defaultSubDir, inputPath);
  // }

  // Case 4: Already absolute path (return as-is)
  return inputPath;
}
function normalizeTypePath(inputPath: string): string {
  // Case 0: Handle leading backslash and Windows-style file URI
  if (inputPath.startsWith('\\file:///') || inputPath.startsWith('\file:///') || inputPath.startsWith('/file:///')) {
    // Remove leading slash or backslash, replace all backslashes with slashes
    const cleaned = inputPath.replace(/^\\+|^\/+/, '').replace(/\\/g, '/');
    if (cleaned.startsWith('file:///')) {
      return fileURLToPath(cleaned);
    }
    return cleaned;
  }

  // Case 1: Handle file:// URIs
  if (inputPath.startsWith('file://')) {
    return fileURLToPath(inputPath);
  }

  // Case 2: Handle relative-looking paths (e.g., /ChathuraIshara/...)
  if (inputPath.startsWith('/') && !inputPath.startsWith(BASE_REPO_DIR)) {
    // Remove leading slash if it's not part of the base dir
    const relativePath = inputPath.startsWith('/') 
      ? inputPath.substring(1) 
      : inputPath;
    return path.join(BASE_REPO_DIR, relativePath);
  }

  // Case 3: Only filename (e.g., main.bal)
  // if (!inputPath.includes('/') && !inputPath.includes('\\')) {
  //   // Set your default subdirectory here:
  //   const defaultSubDir = 'ChathuraIshara/post-intergration';
  //   return path.join(BASE_REPO_DIR, defaultSubDir, inputPath);
  // }

  // Case 4: Already absolute path (return as-is)
  return inputPath;
}
function normalizeFilePathForSyntaxTree(inputPath: string): string {
    const BASE_PREFIX = 'file:///home/my-project/Cloud-editor/bal-server-for-web/repos/';
    
    // Case 1: file:///ChathuraIshara/...
    if (inputPath.startsWith('file:///') && !inputPath.includes('web-bala%3A')) {
        const relativePath = inputPath.replace('file:///', '');
        return BASE_PREFIX + relativePath;
    }
    
    // Case 2: file:///web-bala%3A/ChathuraIshara/...
    if (inputPath.startsWith('file:///web-bala%3A/')) {
        const relativePath = inputPath.replace('file:///web-bala%3A/', '');
        return BASE_PREFIX + relativePath;
    }
    
    // If neither case matches, return as-is (or throw error if you prefer)
    return inputPath;
}

// Converts a file URI to an absolute file URI rooted at BASE_REPO_DIR.
function normalizeFilePathForSyntaxTreeModify(inputUri: string): string {
  if (!inputUri.startsWith('file:///')) return inputUri;

  // Handle file:///web-bala%3A/ prefix (URL-encoded 'web-bala:')
  if (inputUri.startsWith('file:///web-bala%3A/')) {
    const relativePath = inputUri.replace('file:///web-bala%3A/', '');
    const absPath = path.join(BASE_REPO_DIR, relativePath);
    return URI.file(absPath).toString();
  }

  // Remove 'file://', keep the path part
  const pathPart = inputUri.replace('file://', '');
  // If already absolute (starts with BASE_REPO_DIR), return as is
  if (pathPart.startsWith(BASE_REPO_DIR)) {
    return inputUri;
  }
  // Remove leading slashes and join with BASE_REPO_DIR
  const relativePath = pathPart.replace(/^\/+/, '');
  const absPath = path.join(BASE_REPO_DIR, relativePath);
  return URI.file(absPath).toString();
}

export function getBallerinaHome(): Promise<BallerinaHome | undefined> {
  return new Promise((resolve, reject) => {
    const balExecutablePath = '/usr/bin/bal';
    const userHome = os.homedir();
    //   console.log(`userHome: ${userHome}`);
    //   const ballerinaUserHomeName = '.ballerina';
    //   console.log(`ballerinaUserHomeName: ${ballerinaUserHomeName}`);
    //   const ballerinaUserHome = path.join(userHome, ballerinaUserHomeName);
    //   console.log(`ballerinaUserHome: ${ballerinaUserHome}`);
    //   const ballerinaHomeCustomDirName = "ballerina-home";
    //   const ballerinaHome = path.join(ballerinaUserHome, ballerinaHomeCustomDirName);
    //   console.log(`ballerinaHome: ${ballerinaHome}`);
    //   const distPath = path.join(ballerinaHome, "bin") + path.sep;
    //   console.log(`distPath: ${distPath}`);
    //   const ballerinaExecutor = 'bal';
    //   let exeExtension = "";
    //   if (os.platform() === "win32") {
    //     exeExtension = ".bat";
    //   }
    // const ballerinaCmd = (distPath + ballerinaExecutor + exeExtension).trim(); 
    exec(`${balExecutablePath} version`, (err, stdout, stderr) => {
      if (stdout) console.log(`bal command stdout: ${stdout}`);
      if (stderr) console.log(`bal command stderr: ${stderr}`);
      if (err || stdout.toLocaleLowerCase().includes("error")) {
        console.error(`bal command error: ${err}`);
        return reject(stdout);
      }

      try {
        const implVersionLine = stdout.split('\n')[0]; // e.g. Ballerina 2201.11.0
        const replacePrefix = implVersionLine.startsWith("jBallerina") ? /jBallerina / : /Ballerina /;
        const parsedVersion = implVersionLine.replace(replacePrefix, '').trim();
        resolve({
          userHome: userHome,
          ballerinaHome: "ballerinaHome",
          distPath: "distPath",
          ballerinaCmd: "ballerinaCmd",
          ballerinaVersionText: parsedVersion,
          ballerinaVersion: parsedVersion.split(" ")[0]
        });
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  });
}

export function resolveNotification(message: NotificationMessage) {
  if (message.method === "textDocument/didOpen" || message.method === "textDocument/didClose") {
    if (
      message.params &&
      typeof message.params === "object" &&
      "textDocument" in message.params &&
      message.params.textDocument &&
      typeof message.params.textDocument === "object" &&
      "uri" in message.params.textDocument &&
      typeof message.params.textDocument.uri === "string"
    ) {
      const uri = message.params.textDocument.uri as string;
      if (uri.startsWith("expr:")) {
        // Remove 'expr:' and any leading slashes
        const relativePath = uri.replace(/^expr:/, "").replace(/^\/+/ , "");
        // Join with BASE_DIR to get absolute path
        const absPath = path.join(BASE_DIR, relativePath);
        // Convert to file URI
        const fileUri = URI.file(absPath).toString();
        message.params.textDocument.uri = fileUri;
      }
    }
  }
  return message;
 
}


