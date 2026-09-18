from user_agents import parse


def analyze_user_agent(user_agent: str):

    parsed = parse(user_agent)

    if parsed.is_mobile:
        device = "Mobile"

    elif parsed.is_tablet:
        device = "Tablet"

    else:
        device = "Desktop"

    return {
        "device": device,
        "browser": parsed.browser.family,
        "operating_system": parsed.os.family,
    }