import json
import xml.etree.ElementTree as ET
prefix = "{http://www.topografix.com/GPX/1/1}"

def extract_data(data, key):
    for child in data:
        if child.tag.replace(prefix,"") == key:
            return child.text

data = open("fix_points.gpx", "r").read()

fix_data = {}
name_list = []

root = ET.fromstring(data)
gpx_children = list(root)

i = 0
total = len(gpx_children)

for fix in gpx_children[1:]:
    pos = [fix.get("lat"), fix.get("lon")]
    type = extract_data(fix, "type")
    name = extract_data(fix, "name")

    name_list.append(name)

    fix_data[name] = {
        "pos": pos,
        "type": type
    }
    i += 1
    if i % 100 == 0:
        print(f"\rProgress: {i}/{total} ({i/total*100}%)", end="")

json_data = {
    "waypoints": fix_data,
    "list": name_list,
    "total": len(name_list)
}

json.dump(json_data, open("fix_points.json", "w"))