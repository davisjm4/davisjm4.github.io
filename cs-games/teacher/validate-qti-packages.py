"""Independent ZIP/XML and response-processing check; this is not a Canvas import."""
import json
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

Q = {"q": "http://www.imsglobal.org/xsd/ims_qtiasiv1p2"}
C = {"c": "http://www.imsglobal.org/xsd/imscp_v1p1"}


def metadata(node, name):
    for field in node.findall("q:qtimetadata/q:qtimetadatafield", Q):
        if field.findtext("q:fieldlabel", namespaces=Q) == name:
            return field.findtext("q:fieldentry", namespaces=Q)


def validate(file):
    with zipfile.ZipFile(file) as archive:
        assert archive.testzip() is None, "CRC failure"
        names = archive.namelist()
        assert len(names) == len(set(names)), "Duplicate ZIP entries"
        manifest = ET.fromstring(archive.read("imsmanifest.xml"))
        for resource in manifest.findall("c:resources/c:resource", C):
            assert resource.attrib["href"] in names
            assert resource.attrib["type"] == "imsqti_xmlv1p2"
            for entry in resource.findall("c:file", C):
                assert entry.attrib["href"] in names
        root = ET.fromstring(archive.read("assessment.xml"))
        expected = json.loads(archive.read("metadata.json"))
        if "items" not in expected:
            expected["items"] = json.loads(file.with_suffix(".expected.json").read_text())
    assessment = root.find("q:assessment", Q)
    items = assessment.findall("q:section/q:item", Q)
    assert len(items) == expected["questions"]
    assert len({i.attrib["ident"] for i in items}) == len(items)
    total = 0
    for item, original in zip(items, expected["items"]):
        if "id" in original:
            assert item.attrib["ident"] == original["id"]
        itemmeta = item.find("q:itemmetadata", Q)
        points = float(metadata(itemmeta, "points_possible"))
        assert points == original["points"]
        assert metadata(itemmeta, "question_type") == "multiple_choice_question"
        total += points
        html = item.findtext("q:presentation/q:material/q:mattext", namespaces=Q)
        # Browser DOM serialization may use &gt; for plain >; compare text and
        # preserve the full HTML string exactly for adapter-generated packages.
        if "id" in original:
            assert html == original["html"], "Context/code lost during XML encoding"
        else:
            from html import unescape
            assert unescape(html) == unescape(original["html"])
        choices = item.findall("q:presentation/q:response_lid/q:render_choice/q:response_label", Q)
        assert 2 <= len(choices) == len({c.attrib["ident"] for c in choices}) <= 4
        feedback = {f.attrib["ident"]: f for f in item.findall("q:itemfeedback", Q)}
        assert set(feedback) == {"general_fb"}
        assert feedback["general_fb"].findtext(".//q:mattext", namespaces=Q) == original["explanation"]
        refs = item.findall("q:resprocessing/q:respcondition/q:displayfeedback", Q)
        assert refs and all(r.attrib["linkrefid"] in feedback for r in refs)
        outcome = item.find("q:resprocessing/q:outcomes/q:decvar", Q)
        assert outcome.attrib == {"maxvalue": "100", "minvalue": "0", "defaultval": "0", "varname": "SCORE", "vartype": "Decimal"}
        conditions = item.findall("q:resprocessing/q:respcondition", Q)
        # Independently execute every answer choice and an omitted response.
        for answer in [*(c.attrib["ident"] for c in choices), None]:
            score, shown = float(outcome.attrib["defaultval"]), []
            for condition in conditions:
                cv = condition.find("q:conditionvar", Q)
                equal = cv.find("q:varequal", Q)
                matched = cv.find("q:other", Q) is not None or (equal is not None and equal.attrib["respident"] == "response_1" and equal.text == answer)
                if not matched:
                    continue
                for change in condition.findall("q:setvar", Q):
                    assert change.attrib == {"action": "Set", "varname": "SCORE"}
                    score = float(change.text)
                shown += [r.attrib["linkrefid"] for r in condition.findall("q:displayfeedback", Q)]
                if condition.attrib.get("continue", "Yes") == "No":
                    break
            correct = answer == f'choice_{original["correctIndex"]}'
            assert score == (100 if correct else 0), "Wrong answer weight"
            assert score / 100 * points == (points if correct else 0), "Double scaling"
            assert shown == ["general_fb"], "Missing, duplicate, or unrelated feedback"
    assert total == expected["points"] == float(metadata(assessment, "points_possible"))
    return {"package": file.name, "items": len(items), "totalPoints": total,
            "zipCrc": "pass", "xml": "pass", "manifest": "pass", "ids": "pass",
            "keys": "pass", "scoringAllChoices": "pass", "feedbackAllChoices": "pass",
            "questionContent": "pass", "canvasImport": "unverified"}


if __name__ == "__main__":
    folder = Path(sys.argv[1])
    results = [validate(file) for file in sorted(folder.glob("*.zip"))]
    assert results, "No packages to validate"
    print(json.dumps(results, indent=2))
