export function stringToBoolean(str: string | null | undefined): boolean {
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
            case "null":
            case "undefined":
            case null:
            case undefined:
                return false;

            default:
                throw new Error("Invalid input");
        }
    } catch (err) {
        console.error("stringToBoolean: error converting ", str, " to boolean");
    }
    return false;
}
