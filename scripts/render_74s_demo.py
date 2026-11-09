import os
import subprocess

ffmpeg = r"C:\Users\USER\AppData\Local\Programs\Python\Python314\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe"
raw_video = r"C:\Users\USER\Downloads\Demo raw.mp4"
temp_dir = r"C:\Users\USER\Downloads\demo_cut_temp_74s"
os.makedirs(temp_dir, exist_ok=True)

# List of segments: (name, start_sec, duration_sec, speed_factor)
# Planned exact durations:
# 01_landing: 6.5s
# 02_upload_doc: 6.0s
# 03_pipeline_run: 8.0s / 1.333333 = 6.0s
# 04_verdict_amber: 5.0s
# 05_promise_vs_paper: 10.0s / 1.149425 = 8.7s
# 06_prompt_injection: 7.5s
# 07_question_yes: 7.5s
# 08_fair_rewrite: 5.0s
# 09_upload_modes_tabs: 7.5s / 1.293103 = 5.8s
# 10_compare_open: 5.5s
# 11_compare_diff_results: 5.0s
# 12_judge_mode_modal: 5.5s
# Total = 6.5 + 6.0 + 6.0 + 5.0 + 8.7 + 7.5 + 7.5 + 5.0 + 5.8 + 5.5 + 5.0 + 5.5 = 74.0s

segments = [
    ("01_landing", 0.0, 6.5, 1.0),
    ("02_upload_doc", 59.0, 6.0, 1.0),
    ("03_pipeline_run", 11.0, 8.0, 8.0 / 6.0),
    ("04_verdict_amber", 23.5, 5.0, 1.0),
    ("05_promise_vs_paper", 36.0, 10.0, 10.0 / 8.7),
    ("06_prompt_injection", 66.5, 7.5, 1.0),
    ("07_question_yes", 87.5, 7.5, 1.0),
    ("08_fair_rewrite", 31.0, 5.0, 1.0),
    ("09_upload_modes_tabs", 152.0, 7.5, 7.5 / 5.8),
    ("10_compare_open", 166.5, 5.5, 1.0),
    ("11_compare_diff_results", 162.5, 5.0, 1.0),
    ("12_judge_mode_modal", 171.0, 5.5, 1.0)
]

clip_paths = []
for name, start, dur, speed in segments:
    out_clip = os.path.join(temp_dir, f"{name}.mp4")
    pts_factor = 1.0 / speed
    vf = f"setpts={pts_factor:.6f}*PTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2"
    
    cmd = [
        ffmpeg, "-y",
        "-ss", str(start),
        "-t", str(dur),
        "-i", raw_video,
        "-vf", vf,
        "-an",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "19",
        out_clip
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    clip_paths.append(out_clip)
    print(f"Rendered segment: {name}")

concat_list = os.path.join(temp_dir, "concat.txt")
with open(concat_list, "w", encoding="utf-8") as f:
    for p in clip_paths:
        normalized = p.replace("\\", "/")
        f.write(f"file '{normalized}'\n")

final_output = r"C:\Users\USER\Downloads\SignSafe_Demo_Cut_74s.mp4"
concat_cmd = [
    ffmpeg, "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concat_list,
    "-c", "copy",
    final_output
]
subprocess.run(concat_cmd, check=True)

# Probe final duration
probe_cmd = [ffmpeg, "-i", final_output]
p = subprocess.run(probe_cmd, stderr=subprocess.PIPE, text=True)
for line in p.stderr.splitlines():
    if "Duration:" in line:
        print("FINAL VIDEO INFO:", line.strip())
        break

size_mb = os.path.getsize(final_output) / (1024 * 1024)
print(f"File size: {size_mb:.2f} MB")
print("SUCCESS! Output video saved at:", final_output)
