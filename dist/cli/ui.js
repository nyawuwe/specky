/**
 * CLI UI Components
 * Beautiful terminal interface using Chalk, Ora, Boxen, and Figlet
 */
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import figlet from 'figlet';
import gradientString from 'gradient-string';
// Specky color palette
const colors = {
    primary: '#7C3AED', // Purple
    secondary: '#10B981', // Green
    accent: '#F59E0B', // Amber
    info: '#3B82F6', // Blue
    error: '#EF4444', // Red
    muted: '#6B7280', // Gray
};
// Custom gradient for Specky
const speckyGradient = gradientString(['#7C3AED', '#EC4899', '#F59E0B']);
/**
 * Display Specky banner
 */
export function showBanner(version) {
    const banner = figlet.textSync('SPECKY', {
        font: 'Small',
        horizontalLayout: 'default',
    });
    console.log('');
    console.log(speckyGradient(banner));
    console.log('');
    console.log(boxen(`${chalk.hex(colors.secondary)('🦔')} Swagger to MCP Server  ${chalk.dim(`v${version}`)}`, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderColor: '#7C3AED',
        borderStyle: 'round',
        dimBorder: true,
    }));
    console.log('');
}
/**
 * Create a spinner
 */
export function createSpinner(text) {
    return ora({
        text,
        color: 'magenta',
        spinner: 'dots',
    });
}
/**
 * Log success message
 */
export function logSuccess(message) {
    console.log(`${chalk.hex(colors.secondary)('✓')} ${message}`);
}
/**
 * Log error message
 */
export function logError(message) {
    console.log(`${chalk.hex(colors.error)('✗')} ${chalk.red(message)}`);
}
/**
 * Log info message
 */
export function logInfo(message) {
    console.log(`${chalk.hex(colors.info)('ℹ')} ${message}`);
}
/**
 * Log warning message
 */
export function logWarning(message) {
    console.log(`${chalk.hex(colors.accent)('⚠')} ${chalk.yellow(message)}`);
}
/**
 * Display tools table
 */
export function showToolsTable(tools) {
    const maxMethodLen = 7; // DELETE is longest
    const maxPathLen = Math.min(40, Math.max(...tools.map((t) => t.endpoint.path.length)));
    const maxDescLen = 40;
    // Header
    const headerLine = `┌${'─'.repeat(maxMethodLen + 2)}┬${'─'.repeat(maxPathLen + 2)}┬${'─'.repeat(maxDescLen + 2)}┐`;
    const footerLine = `└${'─'.repeat(maxMethodLen + 2)}┴${'─'.repeat(maxPathLen + 2)}┴${'─'.repeat(maxDescLen + 2)}┘`;
    const separatorLine = `├${'─'.repeat(maxMethodLen + 2)}┼${'─'.repeat(maxPathLen + 2)}┼${'─'.repeat(maxDescLen + 2)}┤`;
    console.log('');
    console.log(chalk.dim(headerLine));
    console.log(chalk.dim('│') +
        ` ${chalk.bold('Method'.padEnd(maxMethodLen))} ` +
        chalk.dim('│') +
        ` ${chalk.bold('Path'.padEnd(maxPathLen))} ` +
        chalk.dim('│') +
        ` ${chalk.bold('Description'.padEnd(maxDescLen))} ` +
        chalk.dim('│'));
    console.log(chalk.dim(separatorLine));
    // Method colors
    const methodColors = {
        get: colors.info,
        post: colors.secondary,
        put: colors.accent,
        patch: colors.accent,
        delete: colors.error,
        head: colors.muted,
        options: colors.muted,
    };
    // Rows
    for (const tool of tools) {
        const method = tool.endpoint.method.toUpperCase().padEnd(maxMethodLen);
        const methodColor = methodColors[tool.endpoint.method] || colors.muted;
        let path = tool.endpoint.path;
        if (path.length > maxPathLen) {
            path = path.substring(0, maxPathLen - 3) + '...';
        }
        path = path.padEnd(maxPathLen);
        let desc = tool.endpoint.summary || tool.name;
        if (desc.length > maxDescLen) {
            desc = desc.substring(0, maxDescLen - 3) + '...';
        }
        desc = desc.padEnd(maxDescLen);
        console.log(chalk.dim('│') +
            ` ${chalk.hex(methodColor).bold(method)} ` +
            chalk.dim('│') +
            ` ${chalk.white(path)} ` +
            chalk.dim('│') +
            ` ${chalk.dim(desc)} ` +
            chalk.dim('│'));
    }
    console.log(chalk.dim(footerLine));
    console.log('');
}
/**
 * Display spec info
 */
export function showSpecInfo(title, version, baseUrl) {
    console.log(boxen(`${chalk.bold(title)} ${chalk.dim(`v${version}`)}\n${chalk.hex(colors.muted)(baseUrl)}`, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderColor: colors.info,
        borderStyle: 'round',
        title: 'API Spec',
        titleAlignment: 'left',
    }));
}
/**
 * Display server ready message
 */
export function showServerReady() {
    console.log('');
    console.log(boxen(`${chalk.hex(colors.secondary).bold('🚀 MCP Server running on stdio')}\n\n` +
        `${chalk.dim('Connect via Claude Desktop or any MCP client')}\n` +
        `${chalk.dim('Press Ctrl+C to stop')}`, {
        padding: 1,
        borderColor: colors.secondary,
        borderStyle: 'round',
    }));
}
/**
 * Display summary statistics
 */
export function showSummary(total, byMethod) {
    const methodStats = Object.entries(byMethod)
        .map(([method, count]) => `${chalk.bold(method)}: ${count}`)
        .join('  ');
    console.log(`${chalk.hex(colors.primary)('📊')} ${chalk.bold(total)} tools generated  ${chalk.dim('|')}  ${methodStats}`);
}
//# sourceMappingURL=ui.js.map