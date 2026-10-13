#!/usr/bin/env python3
"""Inspect/clean test objects in the R2 bucket via the S3 API. Never prints credentials.
R2_CREDS_JSON points at a chmod-600 JSON with endpoint, bucketName, region, accessKeyId, secretAccessKey
(the same shape as R2_S3_CREDENTIALS). Usage: r2-objects.py ls <prefix> | head <key> | rm <key>"""
import json, os, sys
import boto3
c = json.load(open(os.environ["R2_CREDS_JSON"]))
s3 = boto3.client("s3", endpoint_url=c["endpoint"], aws_access_key_id=c["accessKeyId"],
                  aws_secret_access_key=c["secretAccessKey"], region_name="auto")
cmd, arg = sys.argv[1], sys.argv[2]
if cmd == "ls":
    r = s3.list_objects_v2(Bucket=c["bucketName"], Prefix=arg)
    for o in r.get("Contents", []): print(o["Key"], o["Size"])
    print("count", r.get("KeyCount", 0))
elif cmd == "head":
    try:
        h = s3.head_object(Bucket=c["bucketName"], Key=arg); print("EXISTS", h["ContentLength"], h["ContentType"])
    except Exception as e: print("MISSING", type(e).__name__)
elif cmd == "rm":
    if not arg.startswith("users/"): sys.exit("refusing to delete outside users/")
    s3.delete_object(Bucket=c["bucketName"], Key=arg); print("deleted", arg)
