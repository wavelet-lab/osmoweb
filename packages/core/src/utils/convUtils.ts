export function stringToBoolean(str: string): boolean {
    try {
        switch (str?.toLowerCase()?.trim()) {
            case "true":
            case "yes":
            case "1":
                return true;

            case "false":
            case "no":
            case "0":
            case "":
            case null:
            case undefined:
                return false;

            default:
                return JSON.parse(str);
        }
    } catch (err) {
        console.error("stringToBoolean: error converting ", str, " to boolean");
    }
    return false;
}
