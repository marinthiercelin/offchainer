.mode csv
CREATE TABLE DATA(
    mode TEXT,
    actor TEXT,
    action TEXT,
    type TEXT,
    value REAL,
    unit TEXT
);
.import __DATA_DIR__/__DATA_FILE__ data
CREATE VIEW Average AS
SELECT mode, actor, action, type, unit, AVG(value) as avg_value, COUNT(*) AS nb_entry
FROM data
GROUP BY mode, actor, action, type, unit;

CREATE VIEW VariancePrep AS
SELECT *
FROM Data 
NATURAL JOIN
Average;

CREATE VIEW Final AS
SELECT mode, actor, action, type, unit, avg_value, nb_entry, 
SUM((value-avg_value)*(value-avg_value)) /(COUNT(value)-1) AS variance
FROM VariancePrep
GROUP BY mode, actor, action, type, unit;

