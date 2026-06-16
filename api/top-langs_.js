// @ts-check

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { renderTopLanguages } from "../src/cards/top-languages.js";
import { guardAccess } from "../src/common/access.js";
import { setCacheHeaders } from "../src/common/cache.js";
import { parseArray, parseBoolean } from "../src/common/ops.js";
import { renderError } from "../src/common/render.js";
import { isLocaleAvailable } from "../src/translations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const languageColorsPath = path.join(
    __dirname,
    "../src/common/languageColors.json",
);

const languageColors = JSON.parse(fs.readFileSync(languageColorsPath, "utf8"));

const DEFAULT_COLOR = "#858585";

/**
 * @typedef {import("../src/fetchers/types").TopLangData} TopLangData
 * @param {unknown} langs
 * @returns {TopLangData}
 */
const parseCustomLangs = (langs) => {
    if (!langs || typeof langs !== "string") {
        throw new Error("langs parameter is required");
    }

    const items = langs
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    if (items.length === 0) {
        throw new Error("langs parameter is empty");
    }

    /** @type {TopLangData} */
    const result = {};

    for (const item of items) {
        const [rawName, rawPercent, rawColor] = item.split(":");

        const name = rawName?.trim();
        const percent = Number(rawPercent);
        const color = rawColor?.trim();

        if (!name || Number.isNaN(percent) || percent <= 0) {
            throw new Error(`Invalid language item: ${item}`);
        }

        result[name] = {
            name,
            color: color || languageColors[name] || DEFAULT_COLOR,
            size: percent,
        };
    }

    return result;
};

// @ts-ignore
export default async (req, res) => {
    const {
        langs,
        hide,
        hide_title,
        hide_border,
        card_width,
        title_color,
        text_color,
        bg_color,
        theme,
        layout,
        langs_count,
        custom_title,
        locale,
        border_radius,
        border_color,
        disable_animations,
        hide_progress,
        stats_format,
    } = req.query;

    res.setHeader("Content-Type", "image/svg+xml");

    const access = guardAccess({
        res,
        id: "custom-top-langs",
        type: "username",
        colors: {
            title_color,
            text_color,
            bg_color,
            border_color,
            theme,
        },
    });

    if (!access.isPassed) {
        return access.result;
    }

    if (locale && !isLocaleAvailable(locale)) {
        return res.send(
            renderError({
                message: "Something went wrong",
                secondaryMessage: "Locale not found",
                renderOptions: {
                    title_color,
                    text_color,
                    bg_color,
                    border_color,
                    theme,
                },
            }),
        );
    }

    if (
        layout !== undefined &&
        (typeof layout !== "string" ||
            !["compact", "normal", "donut", "donut-vertical", "pie"].includes(layout))
    ) {
        return res.send(
            renderError({
                message: "Something went wrong",
                secondaryMessage: "Incorrect layout input",
                renderOptions: {
                    title_color,
                    text_color,
                    bg_color,
                    border_color,
                    theme,
                },
            }),
        );
    }

    if (
        stats_format !== undefined &&
        (typeof stats_format !== "string" ||
            !["bytes", "percentages"].includes(stats_format))
    ) {
        return res.send(
            renderError({
                message: "Something went wrong",
                secondaryMessage: "Incorrect stats_format input",
                renderOptions: {
                    title_color,
                    text_color,
                    bg_color,
                    border_color,
                    theme,
                },
            }),
        );
    }

    try {
        const customLangs = parseCustomLangs(langs);

        setCacheHeaders(res, 60);

        return res.send(
            renderTopLanguages(customLangs, {
                custom_title,
                hide_title: parseBoolean(hide_title),
                hide_border: parseBoolean(hide_border),
                card_width: parseInt(card_width, 10),
                hide: parseArray(hide),
                title_color,
                text_color,
                bg_color,
                theme,
                layout,
                langs_count,
                border_radius,
                border_color,
                locale: locale ? locale.toLowerCase() : null,
                disable_animations: parseBoolean(disable_animations),
                hide_progress: parseBoolean(hide_progress),
                stats_format,
            }),
        );
    } catch (err) {
        if (err instanceof Error) {
            return res.send(
                renderError({
                    message: err.message,
                    renderOptions: {
                        title_color,
                        text_color,
                        bg_color,
                        border_color,
                        theme,
                    },
                }),
            );
        }

        return res.send(
            renderError({
                message: "An unknown error occurred",
                renderOptions: {
                    title_color,
                    text_color,
                    bg_color,
                    border_color,
                    theme,
                },
            }),
        );
    }
};