// Downloads WebODM's textured model, turns it into ONE self-contained .glb and
// stores it as cases/<id>/model/scene.glb (served through the authenticated
// /api/uploads/* route).
//
//   textured_model.zip  --extract-->  *.obj + *.mtl + textures  --obj2gltf-->  scene.glb
//
// If the zip already contains a .glb and no .obj, that .glb is used as-is.
const fsp = require("fs/promises");
const path = require("path");
const extract = require("extract-zip");
const uploadCfg = require("../config/upload");
const webodm = require("./webodmClient");
const { getStorageService } = require("../storage/storageService");

async function walk(dir) {
  const out = [];
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

// Prefer the georeferenced mesh (name contains "_geo"): its units are metres.
function pickByExt(files, ext) {
  const matches = files.filter((f) => f.toLowerCase().endsWith(ext));
  return matches.find((f) => /_geo\./i.test(path.basename(f))) || matches[0] || null;
}

async function importTexturedModel({ caseId, projectId, taskId }) {
  const workDir = path.join(uploadCfg.TEMP_DIR, "webodm", `case-${caseId}-${Date.now()}`);
  const unzipDir = path.join(workDir, "unzipped");
  await fsp.mkdir(unzipDir, { recursive: true });

  try {
    const zipPath = path.join(workDir, "textured_model.zip");
    await webodm.downloadAsset(projectId, taskId, "textured_model.zip", zipPath);
    await extract(zipPath, { dir: path.resolve(unzipDir) }); // extract-zip needs an absolute path

    const files = await walk(unzipDir);
    const objPath = pickByExt(files, ".obj");
    const glbPath = pickByExt(files, ".glb");
    if (!objPath && !glbPath) {
      throw new Error("WebODM's textured_model.zip contained no .obj or .glb model");
    }

    const outPath = path.join(workDir, "scene.glb");
    let georeferenced;
    let source;

    if (objPath) {
      const obj2gltf = require("obj2gltf");
      const glb = await obj2gltf(objPath, {
        binary: true,          // single .glb with textures embedded
        inputUpAxis: "Z",      // photogrammetry meshes are Z-up; glTF/three.js are Y-up
        outputUpAxis: "Y",
        unlit: true,           // show the photo texture as captured, no extra shading
        secure: true,          // only read textures that sit next to the .obj
      });
      await fsp.writeFile(outPath, glb);
      georeferenced = /_geo\./i.test(path.basename(objPath));
      source = "obj2gltf";
    } else {
      await fsp.copyFile(glbPath, outPath);
      georeferenced = /_geo\./i.test(path.basename(glbPath));
      source = "webodm-glb";
    }

    const { size } = await fsp.stat(outPath);
    const modelKey = `cases/${caseId}/model/scene.glb`;
    const storage = getStorageService();
    await storage.deleteObject(modelKey); // replace any model from an earlier run
    await storage.putObject(modelKey, outPath);

    return { modelKey, sizeBytes: size, georeferenced, source };
  } finally {
    await fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { importTexturedModel };