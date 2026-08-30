/**
 * SQL Builder — Column Definitions, Joins, CTEs
 * Based on analysis of 51 real SQL queries against is4_lanta_repl database
 */

// ─── Date Presets ───
export const datePresets = [
	{ id: 'current_month', label: 'Текущий месяц', sql: "DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0)" },
	{ id: 'prev_month', label: 'Прошлый месяц', sql: "DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()) - 1, 0)" },
	{ id: '2_months', label: '2 месяца назад', sql: "DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()) - 2, 0)" },
	{ id: '3_months', label: '3 месяца назад', sql: "DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()) - 3, 0)" },
	{ id: '6_months', label: '6 месяцев назад', sql: "DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()) - 6, 0)" },
	{ id: 'last_week', label: 'Последняя неделя', sql: "CONVERT(DATE, DATEADD(WEEK, -1, GETDATE()), 112)" },
	{ id: 'yesterday', label: 'Вчера', sql: "DATEADD(DAY, -1, CONVERT(DATE, GETDATE()))" },
	{ id: 'custom', label: 'Указать дату...', sql: null },
];

// ─── Source Tables ───
export const sources = {
	task: { alias: 't', table: '[is4_lanta_repl].[dbo].[Task]' },
	asset: { alias: 'ast', table: '[is4_lanta_repl].[dbo].[Asset]' },
};

// ─── JOIN Library ───
export const joinLibrary = {
	srv: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[Service] srv ON {src}.ServiceId = srv.Id",
		deps: [],
	},
	st: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[Status] st ON {src}.StatusId = st.Id",
		deps: [],
	},
	pr: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[Priority] pr ON {src}.PriorityId = pr.Id",
		deps: [],
	},
	cre: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[User] cre ON {src}.CreatorId = cre.Id",
		deps: [],
	},
	usr_editor: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[User] usr1 ON {src}.EditorId = usr1.Id",
		deps: [],
	},
	usr_owner: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[User] usr2 ON {src}.OwnerId = usr2.Id",
		deps: [],
	},
	reg: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[TaskTypeComboBox] reg ON reg.Id = {src}.Data.value('(//field[@id=1225]/text())[1]', 'VARCHAR(MAX)')",
		deps: [],
	},
	qual: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[TaskTypeComboBox] qual ON qual.Id = {src}.Data.value('(//field[@id=7367]/text())[1]', 'VARCHAR(MAX)')",
		deps: [],
	},
	ur: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[TaskTypeComboBox] ur ON ur.Id = {src}.Data.value('(//field[@id=3680]/text())[1]', 'VARCHAR(MAX)')",
		deps: [],
	},
	ur1_client: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[TaskTypeComboBox] ur1 ON ur1.Id = {src}.Data.value('(//field[@id=1250]/text())[1]', 'VARCHAR(MAX)')",
		deps: [],
	},
	dep: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[TaskTypeComboBox] dep ON dep.Id = {src}.Data.value('(//field[@id=7364 or @id=6423]/text())[1]', 'VARCHAR(MAX)')",
		deps: [],
	},
	parent_task: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[Task] pt ON {src}.ParentId = pt.Id",
		deps: [],
	},
	cre_company: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[Company] cmp_cre ON cre.CompanyId = cmp_cre.Id",
		deps: ['cre'],
	},
	stopp: {
		sql: "LEFT JOIN [is4_lanta_repl].[dbo].[TaskTypeComboBox] stopp ON stopp.Id = {src}.Data.value('(//field[@id=7372]/text())[1]', 'VARCHAR(MAX)')",
		deps: [],
	},
};

// ─── CTE Library ───
export const cteLibrary = {
	TaskParentAggregated: {
		sql: `TaskParentAggregated AS (
    SELECT 
        ParentId,
        CAST(STRING_AGG(CAST(Id AS NVARCHAR(MAX)), ', ') AS NVARCHAR(MAX)) AS ChildIds
    FROM [is4_lanta_repl].[dbo].[Task]
    GROUP BY ParentId
)`,
		joinSql: "LEFT JOIN TaskParentAggregated tp ON {src}.Id = tp.ParentId",
	},
	TaskParent: {
		sql: `TaskParent AS (
    SELECT 
        Id,
        CAST(STRING_AGG(CAST(Id AS NVARCHAR(MAX)), ', ') AS NVARCHAR(MAX)) AS ParentsIds
    FROM [is4_lanta_repl].[dbo].[Task]
    GROUP BY Id
)`,
		joinSql: "LEFT JOIN TaskParent tc ON {src}.ParentId = tc.Id",
	},
	TaskExecutorsInfo: {
		sql: `TaskExecutorsInfo AS (
    SELECT 
        te.TaskId,
        u.Name AS ExecutorName,
        cm.Name AS Department
    FROM [is4_lanta_repl].[dbo].[TaskExecutor] te
    LEFT JOIN [is4_lanta_repl].[dbo].[User] u ON te.UserId = u.Id
    LEFT JOIN [is4_lanta_repl].[dbo].[Company] cm ON u.CompanyId = cm.Id
)`,
		joinSql: null,
	},
	AggregatedExecutors: {
		sql: `AggregatedExecutors AS (
    SELECT TaskId, STRING_AGG(ExecutorName, ', ') AS Исполнители
    FROM TaskExecutorsInfo
    GROUP BY TaskId
)`,
		joinSql: "LEFT JOIN AggregatedExecutors ae ON {src}.Id = ae.TaskId",
		deps: ['TaskExecutorsInfo'],
	},
	FilteredDEP: {
		sql: `FilteredDEP AS (
    SELECT TaskId, STRING_AGG(Department, ', ') AS Подразделение
    FROM (SELECT DISTINCT TaskId, Department FROM TaskExecutorsInfo) AS x
    GROUP BY TaskId
)`,
		joinSql: "LEFT JOIN FilteredDEP fd ON {src}.Id = fd.TaskId",
		deps: ['TaskExecutorsInfo'],
	},
	CombinedExecutors: {
		sql: `CombinedExecutors AS (
    SELECT TaskId, STRING_AGG(CAST(TRIM(value) AS VARCHAR(MAX)), ', ') AS UniqueExecutors
    FROM (
        SELECT DISTINCT TaskId, TRIM(value) AS value
        FROM [is4_lanta_repl].[dbo].[TaskHistory]
        CROSS APPLY STRING_SPLIT(Executors, ',')
        WHERE BlocksChanged LIKE '%taskexecutors%'
    ) AS SplitExecutors
    GROUP BY TaskId
)`,
		joinSql: "LEFT JOIN CombinedExecutors ce ON {src}.Id = ce.TaskId",
	},
	TaskCreatorInfo: {
		sql: `TaskCreatorInfo AS (
    SELECT te.Id, u.Name AS CreatorName, cm.Name AS CreatorDepartment
    FROM [is4_lanta_repl].[dbo].[Task] te
    LEFT JOIN [is4_lanta_repl].[dbo].[User] u ON te.CreatorId = u.Id
    LEFT JOIN [is4_lanta_repl].[dbo].[Company] cm ON u.CompanyId = cm.Id
)`,
		joinSql: "LEFT JOIN TaskCreatorInfo ci ON {src}.Id = ci.Id",
	},
	TaskFiles: {
		sql: `TaskFiles AS (
    SELECT TaskId, Changed, Files,
        ROW_NUMBER() OVER (PARTITION BY TaskId ORDER BY Changed DESC) AS rn
    FROM [is4_lanta_repl].[dbo].[TaskHistory]
    WHERE BlocksChanged LIKE '%files%' AND Files != ''
)`,
		joinSql: "LEFT JOIN TaskFiles tf ON {src}.Id = tf.TaskId AND tf.rn = 1",
	},
	TaskCountAssets: {
		sql: `TaskCountAssets AS (
    SELECT TaskId, AssetId,
        ROW_NUMBER() OVER (PARTITION BY TaskId ORDER BY TaskId DESC) AS RowNum,
        COUNT(*) OVER (PARTITION BY TaskId) AS TaskIdRowCount
    FROM [is4_lanta_repl].[dbo].[TaskAsset]
)`,
		joinSql: "LEFT JOIN TaskCountAssets tca ON {src}.Id = tca.TaskId AND tca.RowNum = 1",
	},
};

// ─── TypeId mapping ───
export const typeIdMap = [
	{ value: 1039, label: 'ЛантаСервис-универсальная' },
	{ value: 1044, label: 'Эскалация УСП' },
	{ value: 1054, label: 'Запрос на закупку' },
	{ value: 1057, label: 'Закупка 24' },
	{ value: 1058, label: 'Закупка Мин. Запаса' },
	{ value: 1062, label: 'Закупка СЦ' },
	{ value: 1067, label: 'Списание ТМЦ' },
	{ value: 1068, label: 'Закупка СЦ Карта' },
	{ value: 1070, label: 'Приёмка ТМЦ' },
	{ value: 1081, label: 'Заявка для ИТ-инфраструктуры' },
	{ value: 1089, label: 'Гарантия' },
	{ value: 1101, label: 'ГАУ КК «МФЦ КК»' },
	{ value: 1107, label: 'Отправка логистам' },
];

export const serviceIdMap = [
	{ value: 15, label: 'МЕРКУРИ МОДА' },
	{ value: 16, label: 'Гарантийное обслуживание TSC' },
	{ value: 17, label: 'СК Согласие' },
	{ value: 18, label: 'Гарантийно... / Мобильные термопринтеры' },
	{ value: 19, label: 'Гарантийно... / Стационарные термопринтеры' },
	{ value: 20, label: 'Гарантийно... / Промышленные термопринтеры' },
	{ value: 22, label: 'OkMarket Service' },
	{ value: 23, label: 'Согаз, Сервис печати' },
	{ value: 25, label: 'Московская Биржа' },
	{ value: 28, label: 'ЛантаСервис' },
	{ value: 29, label: 'АльфаСтрахование' },
	{ value: 33, label: 'Росбанк' },
	{ value: 35, label: 'Россельхозбанк' },
	{ value: 38, label: 'СберСервис' },
	{ value: 39, label: 'Королёв. Администрация г. Королёв' },
	{ value: 40, label: 'ДЛТ' },
	{ value: 41, label: 'ТФ "Мостоотряд-36" АО "Мостострой-11"' },
	{ value: 42, label: 'СИНТО' },
	{ value: 43, "label": "СУЭК СГК" },
	{ value: 44, label: 'РУСКЛИМАТ( РКЛИМАТ. РЕГИОН климат)' },
	{ value: 46, label: 'i2' },
	{ value: 47, label: 'ФрешМаркет "ДА"' },
	{ value: 48, label: 'Физика Сети' },
	{ value: 50, label: 'Трансконтейнер' },
	{ value: 51, label: 'Центр развития ВКК' },
	{ value: 53, label: 'СОГАЗ. ДОКУМАТИК' },
	{ value: 54, label: 'ГРИНАТОМ' },
	{ value: 55, label: 'Отдел УСП / Эскалация УСП' },
	{ value: 56, label: 'КЛИНИСЕРВИС' },
	{ value: 57, label: 'РТ-ИНФОРМ' },
	{ value: 58, label: 'Ферст Рейт' },
	{ value: 59, label: 'Гарантия' },
	{ value: 60, label: 'ИНВЕНТ МСК (AVON)' },
	{ value: 61, label: 'Отдел внедрения и поддержки ПО' },
	{ value: 65, label: 'Отдел Бухг... / Замена документов клиентам' },
	{ value: 66, label: 'Отдел Экспертов' },
	{ value: 70, label: 'Отдел ОСК' },
	{ value: 71, label: 'Отдел ОСК / Отгрузка оборудования' },
	{ value: 72, label: 'Отдел ОСК / Согласование с клиентом' },
	{ value: 74, label: 'Отдел Закупок' },
	{ value: 75, label: 'Отдел Заку... / Запрос на закупку' },
	{ value: 76, label: 'Отдел Заку... / Закупка 24/7' },
	{ value: 77, label: 'Отдел УСП' },
	{ value: 84, label: 'Отдел Заку... / Закупка Мин Запаса' },
	{ value: 85, label: 'test / Тестовый клиентский сервис' },
	{ value: 87, label: 'Почта РФ' },
	{ value: 88, label: 'test / Тестовый внутренний сервис' },
	{ value: 89, label: 'Отдел Бухгалтерия' },
	{ value: 93, label: 'Отдел Бухг... / Заявка на обработку Актов сверки' },
	{ value: 94, label: 'test' },
	{ value: 95, label: 'test / Тестовый сервис СП' },
	{ value: 96, label: 'Отдел Заку... / Закупка СЦ' },
	{ value: 97, label: 'Согаз-Жизнь' },
	{ value: 100, label: 'METRO' },
	{ value: 101, label: 'Отдел Бухг... / Быстрые оплаты' },
	{ value: 102, label: 'Азия Инвест Банк (АО)' },
	{ value: 103, label: 'Отдел Заку... / Закупки СЦ Карта' },
	{ value: 105, label: 'Отдел Бухг... / Списание ТМЦ' },
	{ value: 106, label: 'Отдел Бухг... / Оформление Приёмки' },
	{ value: 107, label: 'Согаз-Мед' },
	{ value: 108, label: 'Промсвязьбанк' },
	{ value: 109, label: 'ФК Открытие' },
	{ value: 110, label: 'test' },
	{ value: 114, label: 'ВОРКУТАУГОЛЬ АО' },
	{ value: 120, label: 'ОТДЕЛ РАЗВИТИЯ' },
	{ value: 122, label: 'Гарантия МТС' },
	{ value: 123, label: 'Отдел IT' },
	{ value: 131, label: 'Тестирование Р-Климат' },
	{ value: 133, label: 'Тест Эксперты' },
	{ value: 135, label: 'СЦ/СП' },
	{ value: 136, label: 'Логистика' },
	{ value: 137, label: 'Согласование биллингов' },
	{ value: 140, label: 'Отдел Заку... / Закупки брак' },
	{ value: 142, label: 'РусГидро' },
	{ value: 145, label: 'МЕЧЕЛ' },
	{ value: 147, label: '"ФКУ ""Соцтех"" (клиент АйтиЛабс)"' },
	{ value: 148, label: 'АО "МАШ"' },
	{ value: 149, label: 'Вкусно и Точка (ООО "Система ПБО")' },
	{ value: 150, label: '"РСХБ-Страхование жизни"' },
	{ value: 152, label: 'Пантум КЦ' },
	{ value: 154, label: 'АО "ОХК ""УРАЛХИМ"""' },
	{ value: 155, label: '"Lamoda (клиент АйтиЛабс)"' },
	{ value: 156, label: 'МУП "ВОДОКАНАЛ"' },
	{ value: 157, label: 'АО "РУМО"' },
	{ value: 158, label: 'ИК Финам' },
	{ value: 160, label: 'Закупка "АйтиЛабс"' },
	{ value: 161, label: 'Онланта' },
	{ value: 162, label: 'Закупка лицензий' },
	{ value: 163, label: 'Детский Мир' },
	{ value: 164, label: 'ГБУЗ СО "ЕКПЦ"' },
	{ value: 165, label: 'МСИА' },
	{ value: 166, label: 'ИП Айдор Д.А' },
	{ "value": 167, "label": "Альфа Банк" },
	{ "value": 168, "label": "Гарантия \"Pantum\"" },
	{ "value": 169, "label": "ГАУ КК «МФЦ КК»" },
	{ "value": 170, "label": "Подменное оборудование" },
	{ "value": 171, "label": "СУЭК-СГК" },
	{ "value": 172, "label": "Арендное оборудование" },
	{ "value": 173, "label": "ПАО Банк Зенит" },
	{ "value": 174, "label": "Лантасервис (клиенты)" },
	{ "value": 175, "label": "ПАО \"Ростелеком\"" },
	{ "value": 176, "label": "Тануки" },
	{ "value": 177, "label": "ПАО ВымпелКом" },
	{ "value": 180, "label": "Отдел УСП / Отправка на ремонт в СЦ" },
	{ "value": 181, "label": "АО \"ДИАЙПИ\"" },
	{ "value": 183, "label": "Эскалация клиента" },
	{ "value": 184, "label": "ПАО Совкомбанк" },
	{ "value": 185, "label": "Отдел Заку... / Отправка логистам" },
	{ "value": 186, "label": "ООО \"Датафорт\"" },
	{ "value": 187, "label": "ООО \"ПАХТА ДЖУНИОР\"" },
	{ "value": 188, "label": "Банк Россия" },
	{ "value": 189, "label": "Медпойнт" }
];

// ─── CompanyId mapping ───
export const companyIdMap = [
	{ value: 93, label: 'LantaService' },
	{ value: 94, label: 'ЦУМ' },
	{ value: 95, label: 'СК Согласие' },
	{ value: 96, label: 'X5 Retail Group' },
	{ value: 97, label: 'Датакрат' },
	{ value: 98, label: 'OKMarket' },
	{ value: 99, label: 'АО "СОГАЗ"' },
	{ value: 106, label: 'Московская Биржа' },
	{ value: 107, label: 'Тестовая компания' },
	{ value: 108, label: 'АльфаСтрахование' },
	{ value: 109, label: 'ПАО "Квадра"' },
	{ value: 110, label: 'ПАО "РосБанк"' },
	{ value: 111, label: 'Нефтьмагистраль' },
	{ value: 112, label: 'Lamoda' },
	{ value: 113, label: 'Подрядчики' },
	{ value: 114, label: 'Сервис НН' },
	{ value: 116, label: 'Россельхозбанк' },
	{ value: 118, label: 'СбербанкСервис' },
	{ value: 119, label: 'Юнит-партнер' },
	{ value: 120, label: 'Администрация г. Королёв' },
	{ value: 121, label: 'ДЛТ' },
	{ value: 122, label: 'ТФ "Мостоотряд-36" АО "Мостострой-11"' },
	{ value: 123, label: 'СИНТО' },
	{ value: 124, label: 'СУЭК СГК' },
	{ value: 125, label: 'РУСКЛИМАТ' },
	{ value: 127, label: 'ТЕЛЕ2' },
	{ value: 128, label: 'ФрешМаркет "ДА"' },
	{ value: 129, label: 'ООО Физика Сети' },
	{ value: 131, label: 'Трансконтейнер' },
	{ value: 133, label: 'Центр развития ВКК' },
	{ value: 136, label: 'АО "ГРИНАТОМ"' },
	{ value: 137, label: 'РТ-ИНФОРМ' },
	{ value: 138, label: 'Фёрст Рейт' },
	{ value: 139, label: 'ООО "Обермейстер"' },
	{ value: 140, label: 'Группа компаний "Аист"' },
	{ value: 141, label: 'ООО "Маст Сервис"' },
	{ value: 142, label: 'Хелплайн' },
	{ value: 143, label: 'Датакрат-Иж' },
	{ value: 144, label: 'ООО "МТ Сервис"' },
	{ value: 145, label: 'Принтград' },
	{ value: 146, label: 'ИТЛ' },
	{ value: 147, label: 'ООО "Союз-76"' },
	{ value: 148, label: 'ИНВЕНТ МСК' },
	{ value: 149, label: 'Склад' },
	{ value: 150, label: 'ЮНИСЕРВИС' },
	{ value: 151, label: 'MetRo' },
	{ value: 152, label: 'Азия-Инвест Банк (АО)' },
	{ value: 153, label: 'Согаз Жизнь' },
	{ value: 154, "label": "Согаз МЕД" },
	{ value: 155, "label": "Промсвязьбанк" },
	{ value: 156, "label": "тестовая" },
	{ value: 192, "label": "айти лабс" },
	{ value: 193, "label": "ФК Открытие" },
	{ value: 194, "label": "ВОРКУТА УГОЛЬ" },
	{ value: 195, "label": "Гарантия МТС" },
	{ value: 201, "label": "СУЭК СГК Гарантия" },
	{ "value": 205, "label": "Сендис" },
	{ "value": 210, "label": "ПАО «РусГидро»" },
	{ "value": 211, "label": "МЕЧЕЛ" },
	{ "value": 215, "label": "ФКУ \"Соцтех\"" },
	{ "value": 218, "label": "Вкусно и Точка" },
	{ "value": 219, "label": "РСХБ-Страхование жизни" },
	{ "value": 220, "label": "МУП \"ВОДОКАНАЛ\"" },
	{ "value": 221, "label": "ИК Финам" },
	{ "value": 222, "label": "ООО \"Система ПБО\"" },
	{ "value": 223, "label": "ООО Онланта" },
	{ "value": 224, "label": "АО \"РУМО\"" },
	{ "value": 225, "label": "ГБУЗ СО «ЕКПЦ»" },
	{ "value": 226, "label": "Детский Мир" },
	{ "value": 227, "label": "Почта РФ" },
	{ "value": 228, "label": "Альфа-Банк" },
	{ "value": 230, "label": "ГАУ КК «МФЦ КК»" },
	{ "value": 231, "label": "ПАО Банк Зенит" },
	{ "value": 232, "label": "Тануки" },
	{ "value": 233, "label": "ПАО \"ВымпелКом\"" },
	{ "value": 235, "label": "АО «ДИАЙПИ»" },
	{ "value": 236, "label": "ООО \"Датафорт\"" },
	{ "value": 237, "label": "Медпойнт" }
];

// ─── Column Definitions ───
export const columnCategories = [
	{
		id: 'identifiers',
		label: 'Идентификаторы',
		icon: 'tag',
		columns: [
			{ id: 'task_id', label: 'Номер заявки', source: 'task', selectExpr: "{src}.[Id]", alias: 'Номер заявки' },
			{ id: 'asset_id', label: 'Номер актива', source: 'asset', selectExpr: "{src}.[Id]", alias: 'Номер актива' },
			{ id: 'task_name', label: 'Наименование', source: 'task', selectExpr: "{src}.[Name]", alias: 'Наименование' },
			{ id: 'parent_ids', label: 'Родительские', source: 'task', selectExpr: "tc.ParentsIds", alias: 'Родительские', requiresCTE: ['TaskParent'] },
			{ id: 'child_ids', label: 'Дочерние', source: 'task', selectExpr: "tp.ChildIds", alias: 'Дочерние', requiresCTE: ['TaskParentAggregated'] },
			{ id: 'ext_number', label: 'Внешний номер', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=1317]/text())[1]', 'VARCHAR(MAX)')", alias: 'Внешний номер' },
			{ id: 'task_link', label: 'Ссылка на заявку', source: 'task', selectExpr: "CONCAT('https://intra.lantaservice.com/Task/View/', {src}.Id)", alias: 'Ссылка на заявку' },
			{ id: 'task_assets', label: 'Активы', source: 'task', selectExpr: "{src}.Assets", alias: 'Активы' },
			{ id: 'asset_count', label: 'Кол-во активов', source: 'task', selectExpr: "tca.TaskIdRowCount", alias: 'Кол-во активов', requiresCTE: ['TaskCountAssets'] },
		],
	},
	{
		id: 'dates',
		label: 'Даты',
		icon: 'calendar_today',
		columns: [
			{ id: 'task_created', label: 'Дата создания', source: 'task', selectExpr: "FORMAT({src}.Created, 'dd.MM.yyyy HH:mm:ss')", alias: 'Дата создания' },
			{ id: 'task_changed', label: 'Дата изменения', source: 'task', selectExpr: "FORMAT({src}.Changed, 'dd.MM.yyyy HH:mm:ss')", alias: 'Дата изменения' },
			{ id: 'task_deadline', label: 'Срок план', source: 'task', selectExpr: "FORMAT({src}.Deadline, 'dd.MM.yyyy HH:mm')", alias: 'Срок план' },
			{ id: 'task_resolution', label: 'Срок факт', source: 'task', selectExpr: "FORMAT({src}.ResolutionDateFact, 'dd.MM.yyyy HH:mm')", alias: 'Срок факт' },
			{ id: 'asset_created', label: 'Дата создания актива', source: 'asset', selectExpr: "FORMAT({src}.Created, 'dd.MM.yyyy HH:mm:ss')", alias: 'Дата создания' },
			{ id: 'asset_changed', label: 'Дата изменения актива', source: 'asset', selectExpr: "FORMAT({src}.Changed, 'dd.MM.yyyy HH:mm:ss')", alias: 'Дата изменения' },
			{ id: 'last_file_date', label: 'Дата последнего файла', source: 'task', selectExpr: "FORMAT(tf.Changed, 'dd.MM.yyyy HH:mm')", alias: 'Дата прикрепления файла', requiresCTE: ['TaskFiles'] },
			{ id: 'field_1301', label: 'Срок исполнения', source: 'task', selectExpr: "FORMAT({src}.Data.value('(//field[@id=1301]/text())[1]', 'DATETIME'), 'dd.MM.yyyy HH:mm')", alias: 'Срок исполнения' },
		],
	},
	{
		id: 'people',
		label: 'Люди',
		icon: 'people',
		columns: [
			{ id: 'creator_name', label: 'Заявитель', source: 'task', selectExpr: "cre.Name", alias: 'Заявитель', requiresJoin: ['cre'] },
			{ id: 'creator_dept', label: 'Подразделение заявителя', source: 'task', selectExpr: "ci.CreatorDepartment", alias: 'Подразделение заявителя', requiresCTE: ['TaskCreatorInfo'] },
			{ id: 'executors', label: 'Исполнители', source: 'task', selectExpr: "{src}.Executors", alias: 'Исполнители' },
			{ id: 'executors_agg', label: 'Исполнители (агр.)', source: 'task', selectExpr: "ae.Исполнители", alias: 'Исполнители', requiresCTE: ['AggregatedExecutors'] },
			{ id: 'all_executors', label: 'Все исполнители', source: 'task', selectExpr: "ce.UniqueExecutors", alias: 'Все исполнители', requiresCTE: ['CombinedExecutors'] },
			{ id: 'departments', label: 'Подразделения исп.', source: 'task', selectExpr: "fd.Подразделение", alias: 'Подразделения', requiresCTE: ['FilteredDEP'] },
			{ id: 'asset_creator', label: 'Создатель актива', source: 'asset', selectExpr: "usr.Name", alias: 'Ф.И.О. создавшего актив', requiresJoin: ['cre'] },
			{ id: 'asset_editor', label: 'Изменивший актив', source: 'asset', selectExpr: "usr1.Name", alias: 'Ф.И.О. изменившего актив', requiresJoin: ['usr_editor'] },
			{ id: 'asset_owner', label: 'Владелец актива', source: 'asset', selectExpr: "usr2.Name", alias: 'Ф.И.О. владельца актива', requiresJoin: ['usr_owner'] },
		],
	},
	{
		id: 'organization',
		label: 'Организация',
		icon: 'business',
		columns: [
			{ id: 'region', label: 'Регион', source: 'task', selectExpr: "reg.NameXml.value('(//Language/Ru)[1]', 'NVARCHAR(MAX)')", alias: 'Регион', requiresJoin: ['reg'] },
			{ id: 'ur_lica', label: 'Юридические лица', source: 'task', selectExpr: "ur.NameXml.value('(//Language/Ru)[1]', 'NVARCHAR(MAX)')", alias: 'Юридические лица', requiresJoin: ['ur'] },
			{ id: 'client', label: 'Клиенты', source: 'task', selectExpr: "ur1.NameXml.value('(//Language/Ru)[1]', 'NVARCHAR(MAX)')", alias: 'Клиенты', requiresJoin: ['ur1_client'] },
			{ id: 'department_field', label: 'Подразделение', source: 'task', selectExpr: "dep.NameXml.value('(//Language/Ru)[1]', 'NVARCHAR(MAX)')", alias: 'Подразделение', requiresJoin: ['dep'] },
			{ id: 'city', label: 'Населенный пункт', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=1226]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Населенный пункт' },
			{ id: 'address', label: 'Адрес', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=1227]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Адрес' },
		],
	},
	{
		id: 'classification',
		label: 'Классификация',
		icon: 'category',
		columns: [
			{ id: 'service', label: 'Сервис', source: 'task', selectExpr: "srv.NameXml.value('(//Language/Ru)[1]', 'NVARCHAR(MAX)')", alias: 'Сервис', requiresJoin: ['srv'] },
			{ id: 'status', label: 'Статус', source: 'task', selectExpr: "st.NameXml.value('(//Language/Ru)[1]', 'NVARCHAR(MAX)')", alias: 'Статус', requiresJoin: ['st'] },
			{ id: 'priority', label: 'Приоритет', source: 'task', selectExpr: "pr.NameXml.value('(//Language/Ru)[1]', 'NVARCHAR(MAX)')", alias: 'Приоритет', requiresJoin: ['pr'] },
			{ id: 'categories', label: 'Категории', source: 'task', selectExpr: "{src}.Categories", alias: 'Категории' },
			{ id: 'type_name', label: 'Тип', source: 'task', selectExpr: `CASE
        WHEN {src}.TypeId = 1039 THEN 'ЛантаСервис-универсальная'
        WHEN {src}.TypeId = 1044 THEN 'Эскалация УСП'
        WHEN {src}.TypeId = 1054 THEN 'Запрос на закупку'
        WHEN {src}.TypeId = 1057 THEN 'Закупка 24'
        WHEN {src}.TypeId = 1058 THEN 'Закупка Мин. Запаса'
        WHEN {src}.TypeId = 1062 THEN 'Закупка СЦ'
        WHEN {src}.TypeId = 1067 THEN 'Списание ТМЦ'
        WHEN {src}.TypeId = 1068 THEN 'Закупка СЦ Карта'
        WHEN {src}.TypeId = 1070 THEN 'Приёмка ТМЦ'
        WHEN {src}.TypeId = 1081 THEN 'Заявка для ИТ-инфраструктуры'
        WHEN {src}.TypeId = 1089 THEN 'Гарантия'
        WHEN {src}.TypeId = 1101 THEN 'ГАУ КК «МФЦ КК»'
        WHEN {src}.TypeId = 1107 THEN 'Отправка логистам'
    END`, alias: 'Тип' },
			{ id: 'is_archive', label: 'Архивный', source: 'asset', selectExpr: "CASE WHEN {src}.IsArchive = 1 THEN 'Да' ELSE 'Нет' END", alias: 'Архивный' },
			{ id: 'task_files', label: 'Файлы', source: 'task', selectExpr: "{src}.Files", alias: 'Файлы' },
		],
	},
	{
		id: 'equipment',
		label: 'Оборудование',
		icon: 'print',
		columns: [
			{ id: 'model', label: 'Модель аппарата', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=1228]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Модель аппарата' },
			{ id: 'serial', label: 'Серийный номер', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=1230]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Серийный номер' },
			{ id: 'sticker', label: 'Наклейка', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=1229]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Наклейка (важно!)' },
			{ id: 'device_name', label: 'Имя устройства', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=1241]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Имя устройства' },
			{ id: 'asset_client', label: 'Клиент (актив)', source: 'asset', selectExpr: "{src}.Data.value('(//field[@id=55]/text())[1]', 'VARCHAR(MAX)')", alias: 'Клиент' },
			{ id: 'asset_model', label: 'Модель (актив)', source: 'asset', selectExpr: "{src}.Data.value('(//field[@id=42]/text())[1]', 'VARCHAR(MAX)')", alias: 'Модель' },
			{ id: 'asset_serial', label: 'Серийный номер (актив)', source: 'asset', selectExpr: "{src}.Data.value('(//field[@id=54]/text())[1]', 'VARCHAR(MAX)')", alias: 'Серийный номер' },
			{ id: 'asset_address', label: 'Адрес (актив)', source: 'asset', selectExpr: "{src}.Data.value('(//field[@id=56]/text())[1]', 'VARCHAR(MAX)')", alias: 'Адрес' },
			{ id: 'stop_print', label: 'Стоп-печать', source: 'task', selectExpr: "stopp.NameXml.value('(//Language/Ru)[1]', 'NVARCHAR(MAX)')", alias: 'Стоп-печать', requiresJoin: ['stopp'] },
		],
	},
	{
		id: 'finance',
		label: 'Финансы',
		icon: 'payments',
		columns: [
			{ id: 'sum_prepay', label: 'Предоплата', source: 'task', selectExpr: "FORMAT(ISNULL(TRY_CAST({src}.Data.value('(//field[@id=2308 or @id=1782 or @id=2404]/text())[1]', 'NVARCHAR(MAX)') AS DECIMAL(18, 2)), 0), 'N2')", alias: 'Сумма Закупки Предоплата' },
			{ id: 'sum_postpay', label: 'Постоплата', source: 'task', selectExpr: "FORMAT(ISNULL(TRY_CAST({src}.Data.value('(//field[@id=2309 or @id=1795 or @id=2405]/text())[1]', 'NVARCHAR(MAX)') AS DECIMAL(18, 2)), 0), 'N2')", alias: 'Сумма Закупки Постоплата' },
			{ id: 'sum_warehouse', label: 'Со склада', source: 'task', selectExpr: "FORMAT(ISNULL(TRY_CAST({src}.Data.value('(//field[@id=2553 or @id=3917]/text())[1]', 'NVARCHAR(MAX)') AS DECIMAL(18, 2)), 0), 'N2')", alias: 'Стоимость со склада' },
			{ id: 'sum_card', label: 'Карта', source: 'task', selectExpr: "FORMAT(ISNULL(TRY_CAST({src}.Data.value('(//field[@id=3674 or @id=3918 or @id=2999]/text())[1]', 'NVARCHAR(MAX)') AS DECIMAL(18, 2)), 0), 'N2')", alias: 'Сумма Карта' },
			{ id: 'sum_logistics', label: 'Логистика', source: 'task', selectExpr: "FORMAT(ISNULL(TRY_CAST({src}.Data.value('(//field[@id=2933 or @id=3962 or @id=3964]/text())[1]', 'NVARCHAR(MAX)') AS DECIMAL(18, 2)), 0), 'N2')", alias: 'Стоимость Логистики' },
			{ id: 'sum_total', label: 'Итог за минусом штрафов', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=3922]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Сумма итого за минусом штрафных санкций' },
			{ id: 'sum_penalty', label: 'Сумма штрафа', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=3959]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Сумма штрафа' },
			{ id: 'sum_approved', label: 'Итоговая согласованная', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=3085]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Итоговая согласованная сумма' },
			{ id: 'sum_zip_sp', label: 'Сумма ЗиП от СП', source: 'task', selectExpr: "FORMAT(ISNULL(CAST({src}.Data.value('(//field[@id=1297]/text())[1]', 'NVARCHAR(MAX)') AS DECIMAL(18,2)), 0), 'N2', 'ru-RU')", alias: 'Сумма ЗиП от СП' },
		],
	},
	{
		id: 'logistics',
		label: 'Логистика',
		icon: 'local_shipping',
		columns: [
			{ id: 'track_number', label: 'Трек-номер', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=3083]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Трек номер' },
			{ id: 'track_warehouse', label: 'Трек до склада', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=5871]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Трек номер до склада' },
			{ id: 'shipment_number', label: 'Номер отгрузки', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=1302]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Номер отгрузки' },
			{ id: 'delivery_date', label: 'Дата поставки', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=7373]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Фактическая дата поставки' },
			{ id: 'delivery_address', label: 'Адрес доставки', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=2554]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Адрес доставки до получателя' },
			{ id: 'supplier', label: 'Поставщик', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=7945]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Поставщик' },
		],
	},
	{
		id: 'quality',
		label: 'Качество / Контроль',
		icon: 'verified',
		columns: [
			{ id: 'quality', label: 'Качество', source: 'task', selectExpr: "qual.NameXml.value('(//Language/Ru)[1]', 'NVARCHAR(MAX)')", alias: 'Качество', requiresJoin: ['qual'] },
			{ id: 'violated', label: 'Нарушено', source: 'task', selectExpr: "CASE WHEN {src}.ResolutionOverdue = 1 OR {src}.Data.value('(//field[@id=7367]/text())[1]', 'NVARCHAR(MAX)') = '12140' THEN 'Да' ELSE 'Нет' END", alias: 'Нарушено' },
			{ id: 'overdue', label: 'Нарушен срок', source: 'task', selectExpr: "CASE WHEN {src}.ResolutionOverdue = 1 THEN 'Да' ELSE 'Нет' END", alias: 'Нарушен срок' },
			{ id: 'comment_okk', label: 'Комментарий ОКК', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=7368]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Комментарий ОКК' },
			{ id: 'violation_reason', label: 'Причина нарушения', source: 'task', selectExpr: `CASE
        WHEN {src}.Data.value('(//field[@id=7636]/text())[1]', 'NVARCHAR(MAX)') = '14345' THEN 'Ожидание сотрудника (ремонт/диагностика)'
        WHEN {src}.Data.value('(//field[@id=7636]/text())[1]', 'NVARCHAR(MAX)') = '14346' THEN 'Ожидание сотрудника (доставка)'
        WHEN {src}.Data.value('(//field[@id=7636]/text())[1]', 'NVARCHAR(MAX)') = '14347' THEN 'Нет запаса ЗИП в регионе заявки'
        WHEN {src}.Data.value('(//field[@id=7636]/text())[1]', 'NVARCHAR(MAX)') = '14348' THEN 'Нет запаса РМ в регионе заявки'
        WHEN {src}.Data.value('(//field[@id=7636]/text())[1]', 'NVARCHAR(MAX)') = '14349' THEN 'Отправка ТК выгоднее'
        WHEN {src}.Data.value('(//field[@id=7636]/text())[1]', 'NVARCHAR(MAX)') = '14350' THEN 'Клиент не может принять инженера'
        WHEN {src}.Data.value('(//field[@id=7636]/text())[1]', 'NVARCHAR(MAX)') = '14995' THEN 'Перенос сроков логистикой'
        WHEN {src}.Data.value('(//field[@id=7636]/text())[1]', 'NVARCHAR(MAX)') = '14996' THEN 'Брак'
        WHEN {src}.Data.value('(//field[@id=7636]/text())[1]', 'NVARCHAR(MAX)') = '15370' THEN 'Не по вине исполнителя'
        WHEN {src}.Data.value('(//field[@id=7636]/text())[1]', 'NVARCHAR(MAX)') = '14351' THEN 'Другое'
    END`, alias: 'Причина нарушения срока' },
			{ id: 'violation_comment', label: 'Комментарий нарушения', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=7637]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Комментарий для причины нарушения срока' },
			{ id: 'kc_history', label: 'История КЦ', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=5556]/text())[1]', 'NVARCHAR(MAX)')", alias: 'История действий КЦ' },
			{ id: 'resolution', label: 'Решение/Причина', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=1323]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Решение/Причина отклонения' },
			{ id: 'avr_date', label: 'Дата по АВР', source: 'task', selectExpr: "FORMAT({src}.Data.value('(//field[@id=7362]/text())[1]', 'DATETIME'), 'dd.MM.yyyy HH:mm')", alias: 'Дата и время по АВР' },
			{ id: 'avr_note', label: 'Дописка в АВР', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=7363]/text())[1]', 'NVARCHAR(MAX)')", alias: 'Дописка в АВР' },
			{ id: 'plan_actions', label: 'План и история', source: 'task', selectExpr: "{src}.Data.value('(//field[@id=7976]/text())[1]', 'NVARCHAR(MAX)')", alias: 'План и история действий' },
		],
	},
	{
		id: 'escalation',
		label: 'Эскалации',
		icon: 'warning',
		columns: [
			{ id: 'esc_1_date', label: 'Эскалация 1 (дата)', source: 'task', selectExpr: "FORMAT(CAST({src}.Data.value('(//field[@id=7958]/text())[1]', 'DATETIME') AS DATETIME), 'dd.MM.yyyy HH:mm')", alias: 'Дата эскалации 1' },
			{ id: 'esc_2_date', label: 'Эскалация 2 (дата)', source: 'task', selectExpr: "FORMAT(CAST({src}.Data.value('(//field[@id=7959]/text())[1]', 'DATETIME') AS DATETIME), 'dd.MM.yyyy HH:mm')", alias: 'Дата эскалации 2' },
			{ id: 'esc_3_date', label: 'Эскалация 3 (дата)', source: 'task', selectExpr: "FORMAT(CAST({src}.Data.value('(//field[@id=7960]/text())[1]', 'DATETIME') AS DATETIME), 'dd.MM.yyyy HH:mm')", alias: 'Дата эскалации 3' },
			{ id: 'esc_4_date', label: 'Эскалация 4 (дата)', source: 'task', selectExpr: "FORMAT(CAST({src}.Data.value('(//field[@id=7961]/text())[1]', 'DATETIME') AS DATETIME), 'dd.MM.yyyy HH:mm')", alias: 'Дата эскалации 4' },
			{ id: 'esc_5_date', label: 'Эскалация 5 (дата)', source: 'task', selectExpr: "FORMAT(CAST({src}.Data.value('(//field[@id=7962]/text())[1]', 'DATETIME') AS DATETIME), 'dd.MM.yyyy HH:mm')", alias: 'Дата эскалации 5' },
			{ id: 'esc_count', label: 'Кол-во эскалаций', source: 'task', selectExpr: `(
     CASE WHEN NULLIF({src}.Data.value('(//field[@id=7951]/text())[1]', 'NVARCHAR(MAX)'), '') IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN NULLIF({src}.Data.value('(//field[@id=7955]/text())[1]', 'NVARCHAR(MAX)'), '') IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN NULLIF({src}.Data.value('(//field[@id=7954]/text())[1]', 'NVARCHAR(MAX)'), '') IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN NULLIF({src}.Data.value('(//field[@id=7952]/text())[1]', 'NVARCHAR(MAX)'), '') IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN NULLIF({src}.Data.value('(//field[@id=7957]/text())[1]', 'NVARCHAR(MAX)'), '') IS NOT NULL THEN 1 ELSE 0 END
    )`, alias: 'Кол-во эскалаций' },
		],
	},
];

// ─── Department (Отдел) CASE expression ───
export const departmentCaseExpr = `CASE 
    WHEN ae.Исполнители LIKE '%УСП%' AND ae.Исполнители LIKE '%ОТС%' AND ae.Исполнители LIKE '%СЦ %' THEN 'СЦ / УСП / ОТС'
    WHEN ae.Исполнители LIKE '%УСП%' AND ae.Исполнители LIKE '%ОТС%' THEN 'УСП / ОТС'
    WHEN ae.Исполнители LIKE '%УСП%' AND ae.Исполнители LIKE '%СЦ %' AND ae.Исполнители NOT LIKE '%Сфера СЦ ООО%' AND ae.Исполнители NOT LIKE '%ТСЦ Аспект ООО%' AND ae.Исполнители NOT LIKE '%Орион СЦ ООО%' THEN 'СЦ / УСП' 
    WHEN ae.Исполнители LIKE '%ОТС%' AND ae.Исполнители LIKE '%СЦ %' THEN 'СЦ / ОТС'
    WHEN ae.Исполнители LIKE '%УСП%' THEN 'УСП'
    WHEN ae.Исполнители LIKE '%ОТС%' THEN 'ОТС'
    WHEN ae.Исполнители LIKE '%СЦ %' THEN 'СЦ'
    ELSE ''
END`;

// ─── Helper: get all columns flat ───
export function getAllColumns() {
	const result = [];
	for (const cat of columnCategories) {
		for (const col of cat.columns) {
			result.push({ ...col, categoryId: cat.id, categoryLabel: cat.label, categoryIcon: cat.icon });
		}
	}
	return result;
}

// ─── SQL Generator ───
export function generateSQL({ selectedColumns, datePreset, customDate, dateField, sourceType, filterTypeIds, activeServiceIds, inactiveServiceIds, totalServiceCount, activeCompanyIds, inactiveCompanyIds, totalCompanyCount, orderBy, orderDir, topN }) {
	if (!selectedColumns || selectedColumns.length === 0) return '-- Перетащите столбцы в зону конструктора';
	
	const src = sourceType === 'asset' ? 'ast' : 't';
	const srcTable = sourceType === 'asset' ? sources.asset.table : sources.task.table;
	
	// Collect required joins and CTEs
	const requiredJoins = new Set();
	const requiredCTEs = new Set();
	
	for (const col of selectedColumns) {
		if (col.requiresJoin) {
			for (const j of col.requiresJoin) requiredJoins.add(j);
		}
		if (col.requiresCTE) {
			for (const c of col.requiresCTE) {
				requiredCTEs.add(c);
				// Resolve CTE dependencies
				const cteDef = cteLibrary[c];
				if (cteDef && cteDef.deps) {
					for (const dep of cteDef.deps) requiredCTEs.add(dep);
				}
			}
		}
	}
	
	// Also check JOIN dependencies
	for (const jKey of requiredJoins) {
		const joinDef = joinLibrary[jKey];
		if (joinDef && joinDef.deps) {
			for (const d of joinDef.deps) requiredJoins.add(d);
		}
	}
	
	const lines = [];
	
	// 1. DECLARE date
	const datePresetObj = datePresets.find(p => p.id === datePreset);
	const dateSql = datePreset === 'custom' && customDate
		? `'${customDate.replace(/-/g, '')}'`
		: (datePresetObj?.sql || datePresets[1].sql);
	
	lines.push(`DECLARE @StartDate DATETIME = ${dateSql};`);
	lines.push('');
	
	// 2. CTEs
	const cteList = [];
	// Ensure proper order (deps first)
	const orderedCTEs = [];
	const cteSet = new Set(requiredCTEs);
	
	// Simple topological sort
	const visited = new Set();
	function visitCTE(name) {
		if (visited.has(name)) return;
		visited.add(name);
		const cteDef = cteLibrary[name];
		if (cteDef && cteDef.deps) {
			for (const dep of cteDef.deps) {
				if (cteSet.has(dep) || cteLibrary[dep]) {
					cteSet.add(dep);
					visitCTE(dep);
				}
			}
		}
		orderedCTEs.push(name);
	}
	for (const c of cteSet) visitCTE(c);
	
	if (orderedCTEs.length > 0) {
		lines.push('WITH ' + orderedCTEs.map((name, i) => {
			const prefix = i === 0 ? '' : ',\n';
			return prefix + cteLibrary[name].sql;
		}).join('\n'));
		lines.push('');
	}
	
	// 3. SELECT
	const topClause = topN ? `TOP (${topN}) ` : '';
	lines.push(`SELECT ${topClause}`);
	
	const selectParts = selectedColumns.map((col, i) => {
		const expr = col.selectExpr.replace(/\{src\}/g, src);
		const comma = i === 0 ? '    ' : '   ,';
		return `${comma}${expr} AS '${col.alias}'`;
	});
	lines.push(selectParts.join('\n'));
	
	// 4. FROM
	lines.push(`FROM ${srcTable} ${src}`);
	
	// 5. JOINs from joinLibrary
	for (const jKey of requiredJoins) {
		const joinDef = joinLibrary[jKey];
		if (joinDef) {
			lines.push(joinDef.sql.replace(/\{src\}/g, src));
		}
	}
	
	// 6. JOINs from CTEs
	for (const cteName of orderedCTEs) {
		const cteDef = cteLibrary[cteName];
		if (cteDef && cteDef.joinSql) {
			lines.push(cteDef.joinSql.replace(/\{src\}/g, src));
		}
	}
	
	// 7. WHERE
	const whereParts = [];
	
	const actualDateField = dateField || (sourceType === 'asset' ? 'Created' : 'Deadline');
	whereParts.push(`${src}.${actualDateField} >= @StartDate`);
	
	if (filterTypeIds && filterTypeIds.length > 0) {
		whereParts.push(`${src}.TypeId IN (${filterTypeIds.join(', ')})`);
	}
	
	// Smart ServiceId filter: use IN when fewer active, NOT IN when fewer inactive
	const excludedCount = inactiveServiceIds ? inactiveServiceIds.length : 0;
	const activeCount = activeServiceIds ? activeServiceIds.length : totalServiceCount;
	if (excludedCount > 0 && activeCount > 0) {
		if (activeCount <= excludedCount) {
			// Fewer included — use IN (whitelist, catches unknown IDs too)
			whereParts.push(`${src}.ServiceId IN (${activeServiceIds.join(', ')})`);
		} else {
			// Fewer excluded — use NOT IN (shorter SQL)
			whereParts.push(`${src}.ServiceId NOT IN (${inactiveServiceIds.join(', ')})`);
		}
	} else if (excludedCount > 0 && activeCount === 0) {
		// All excluded — impossible to return anything
		whereParts.push('1 = 0 /* все ServiceId исключены */');
	}

	// Smart Client filter (Организация - Клиенты, field 1250): use IN when fewer active, NOT IN when fewer inactive
	const excludedCompCount = inactiveCompanyIds ? inactiveCompanyIds.length : 0;
	const activeCompCount = activeCompanyIds ? activeCompanyIds.length : totalCompanyCount;
	if (excludedCompCount > 0 && activeCompCount > 0) {
		const clientFieldExpr = `${src}.Data.value('(//field[@id=1250]/text())[1]', 'VARCHAR(MAX)')`;
		if (activeCompCount <= excludedCompCount) {
			// Fewer included — use IN
			whereParts.push(`${clientFieldExpr} IN (${activeCompanyIds.map(id => `'${id}'`).join(', ')})`);
		} else {
			// Fewer excluded — use NOT IN
			whereParts.push(`${clientFieldExpr} NOT IN (${inactiveCompanyIds.map(id => `'${id}'`).join(', ')})`);
		}
	} else if (excludedCompCount > 0 && activeCompCount === 0) {
		// All excluded
		whereParts.push('1 = 0 /* все Клиенты исключены */');
	}
	
	if (whereParts.length > 0) {
		lines.push('WHERE');
		lines.push('    ' + whereParts.join('\n    AND '));
	}
	
	// 8. ORDER BY
	if (orderBy) {
		lines.push(`ORDER BY ${src}.${orderBy} ${orderDir || 'DESC'};`);
	} else {
		lines.push(`ORDER BY ${src}.${actualDateField} DESC;`);
	}
	
	return lines.join('\n');
}
