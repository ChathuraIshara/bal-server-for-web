import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { LanguageName, SCHEME } from "./models";
import { BASE_DIR, BASE_DIR_1 } from "../file_system/fsRoutes";
import * as path from "path";
import os from "os";
import { exec } from 'child_process';
import { InitializeParams, InitializeRequest, RegistrationParams, RegistrationRequest, RequestMessage, ResponseMessage } from "vscode-languageserver-protocol";
import { URI } from "vscode-uri";

export const COMMAND_NOT_FOUND = "command not found";
export const NO_SUCH_FILE = "No such file or directory";
export const ERROR = "Error:";

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
    case "serviceDesign/addResource":
    case "expressionEditor/types":
    case "serviceDesign/getListenerFromSource":
    case "serviceDesign/updateListener":
    case "bi-diagram/getVisibleVariableTypes":
    case "serviceDesign/updateService":
    case "expressionEditor/visibleVariableTypes":
    case "flowDesignService/getNodeTemplate":
    case "flowDesignService/getSourceCode":
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
        message.params.documentIdentifier.uri =fileUri;
        console.log("syntaxTree file URI:", message.params.documentIdentifier.uri);
      }
    case "flowDesignService/getEnclosedFunctionDef":
      if (message.params && "filePath" in message.params && message.params.filePath) {
        const inputPath = message.params.filePath as string;
        const fixedPath = URI.parse(inputPath).path;
        message.params.filePath = "/home/my-project/Cloud-editor/bal-server-for-web/repos/ChathuraIshara/post-intergration/main.bal";
        console.log("flowDesignService/getEnclosedFunctionDef:file path", message.params.filePath);
      }
    case "serviceDesign/getServiceFromSource":
      if (message.params && "filePath" in message.params && message.params.filePath) {
        const inputPath = message.params.filePath as string;
        const fixedPath = URI.parse(inputPath).path;
        message.params.filePath = "/home/my-project/Cloud-editor/bal-server-for-web/repos/ChathuraIshara/post-intergration/main.bal";
        console.log("serviceDesign/getServiceFromSource:file path", message.params.filePath);
      }
    case "flowDesignService/getFlowModel":
      if (message.params && "filePath" in message.params && message.params.filePath) {
        const inputPath = message.params.filePath as string;
        const fixedPath = URI.parse(inputPath).path;
        message.params.filePath = "/home/my-project/Cloud-editor/bal-server-for-web/repos/ChathuraIshara/post-intergration/main.bal";
        console.log("flowDesignService/getFlowModel:file path", message.params.filePath);
      }
    case "sequenceModelGeneratorService/getSequenceDiagramModel":
      if (message.params && "filePath" in message.params && message.params.filePath) {
        const inputPath = message.params.filePath as string;
        const fixedPath = URI.parse(inputPath).path;
        message.params.filePath = "/home/my-project/Cloud-editor/bal-server-for-web/repos/ChathuraIshara/post-intergration/main.bal";
        console.log("sequenceModelGeneratorService/getSequenceDiagramModel:file path", message.params.filePath);
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
  }

  return message;
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
