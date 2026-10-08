"use client";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { WorkItem } from "@/lib/studio-records";
import type { Automation } from "./studio-extras";
const key = "creator-studio-v2";
export function useStudioPersistence(
  items: WorkItem[],
  jobs: Automation[],
  setItems: Dispatch<SetStateAction<WorkItem[]>>,
  setJobs: Dispatch<SetStateAction<Automation[]>>,
) {
  const [ready, setReady] = useState(false),
    [status, setStatus] = useState("载入中"),
    [error, setError] = useState("");
  const revision = useRef<string | null>(null),
    last = useRef(""),
    queue = useRef<Promise<void>>(Promise.resolve()),
    blocked = useRef(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/studio/state");
        if (!r.ok) throw Error("无法读取本机数据，请重试");
        const d = await r.json();
        if (!alive) return;
        if (d.state) {
          setItems(d.state.items);
          revision.current = d.state.revision;
          if (d.state.revision !== "legacy") {
            setJobs(d.state.jobs);
            localStorage.setItem(
              "studio-skill-library",
              JSON.stringify(d.state.skills),
            );
            last.current = JSON.stringify({
              items: d.state.items,
              jobs: d.state.jobs,
              skills: d.state.skills,
            });
          } else {
            setJobs(JSON.parse(localStorage.getItem(key + "-jobs") || "[]"));
          }
        } else {
          const i = localStorage.getItem(key);
          if (i) setItems(JSON.parse(i));
          setJobs(JSON.parse(localStorage.getItem(key + "-jobs") || "[]"));
        }
        setReady(true);
        setStatus(last.current ? "已保存本机" : "待保存");
      } catch (e) {
        setError(e instanceof Error ? e.message : "载入失败");
        setStatus("载入失败");
      }
    })();
    return () => {
      alive = false;
    };
  }, [setItems, setJobs]);
  useEffect(() => {
    if (!ready || blocked.current) return;
    const timer = setTimeout(() => {
      const payload = {
        items,
        jobs,
        skills: JSON.parse(
          localStorage.getItem("studio-skill-library") || "[]",
        ),
      };
      const text = JSON.stringify(payload);
      if (last.current === text) return;
      setStatus("保存中");
      queue.current = queue.current.then(async () => {
        if (blocked.current) return;
        try {
          const r = await fetch("/api/studio/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, revision: revision.current }),
          });
          const d = await r.json();
          if (!r.ok) {
            if (r.status === 409) blocked.current = true;
            throw Error(d.error || "保存失败");
          }
          revision.current = d.state.revision;
          last.current = text;
          localStorage.setItem(key, JSON.stringify(items));
          localStorage.setItem(key + "-jobs", JSON.stringify(jobs));
          setStatus("已保存本机");
          setError("");
        } catch (e) {
          setStatus("保存失败");
          setError(e instanceof Error ? e.message : "保存失败");
        }
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [items, jobs, ready]);
  return { ready, status, error };
}
