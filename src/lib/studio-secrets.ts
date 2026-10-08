import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
export function sealSecret(value: string) {
  const key = process.env.WORKBENCH_ENCRYPTION_KEY;
  if (!key) {
    if (process.env.WORKBENCH_DESKTOP_TOKEN) throw Error("安全存储不可用");
    return value;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return "sealed:v1:" + Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}
export function unsealSecret(value: string) {
  if (!value.startsWith("sealed:v1:")) {
    if (process.env.WORKBENCH_DESKTOP_TOKEN) throw Error("请重新配置模型密钥以启用安全存储");
    return value;
  }
  const key = process.env.WORKBENCH_ENCRYPTION_KEY;
  if (!key) throw Error("请在原 Mac 用户的桌面 App 中使用此密钥");
  const data = Buffer.from(value.slice(10), "base64");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "base64"), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}
