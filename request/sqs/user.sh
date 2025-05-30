

# usege: user create [user body as json]
function user() {
    local operation=$1
    local user_body=$2

    if [[ -z "$user_body" ]]; then
        user_body='{ "orgId": "", "userId": "c706c39b-e361-4a12-843d-89ae16c4ec36", "name": "New User", "email": "newuser@example.com" }'
    fi

    case $operation in
        create)
            if [ -z "$user_body" ]; then
                echo "Error: User body is required."
                return 1
            fi
            echo "Creating user with body: $user_body"

            AWS_ACCESS_KEY_ID=root AWS_SECRET_ACCESS_KEY=root \
            aws --endpoint-url=http://localhost:9324 sqs send-message \
                --queue-url http://localhost:9324/queue/UserQueue \
                --message-body '{ "eventType": "create", "body": '"$user_body"' }' \
                --region us-east-1
            ;;
        update)
            if [ -z "$user_body" ]; then
                echo "Error: User body is required."
                return 1
            fi
            echo "Updating user with body: $user_body"

            AWS_ACCESS_KEY_ID=root AWS_SECRET_ACCESS_KEY=root \
            aws --endpoint-url=http://localhost:9324 sqs send-message \
                --queue-url http://localhost:9324/queue/UserQueue \
                --message-body '{ "eventType": "update", "body": '"$user_body"' }' \
                --region us-east-1
            ;;
    esac
}

user "$@"